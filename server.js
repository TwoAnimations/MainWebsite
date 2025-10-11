const express = require('express');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'your-secret-key'; // Замените в продакшене

app.use(cors());
app.use(express.json());

// Хранилище данных (в продакшене используйте базу данных)
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const PENDING_VERIFICATIONS = new Map();

// Инициализация файла пользователей
function initUsersFile() {
    const dir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify([]));
    }
}

// Чтение/запись пользователей
function readUsers() {
    try {
        return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    } catch (error) {
        return [];
    }
}

function writeUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Настройка почтового транспорта
const transporter = nodemailer.createTransporter({
    service: 'gmail', // или другой сервис
    auth: {
        user: 'your-email@gmail.com',
        pass: 'your-app-password'
    }
});

// Генерация кода подтверждения
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// API: Регистрация
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const users = readUsers();
        
        // Проверка существующего пользователя
        if (users.find(u => u.email === email)) {
            return res.json({ success: false, message: 'Email уже зарегистрирован' });
        }

        if (users.find(u => u.username === username)) {
            return res.json({ success: false, message: 'Имя пользователя занято' });
        }

        // Хеширование пароля
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Генерация временного токена
        const tempToken = jwt.sign({ email, username }, JWT_SECRET, { expiresIn: '1h' });
        
        // Генерация кода подтверждения
        const verificationCode = generateVerificationCode();
        
        // Сохранение данных для верификации
        PENDING_VERIFICATIONS.set(email, {
            username,
            email,
            password: hashedPassword,
            code: verificationCode,
            expires: Date.now() + 10 * 60 * 1000 // 10 минут
        });

        // Отправка email
        await transporter.sendMail({
            from: '"TwoAnimations" <noreply@twoanimations.com>',
            to: email,
            subject: 'Подтверждение регистрации',
            html: `
                <h2>Добро пожаловать в TwoAnimations!</h2>
                <p>Ваш код подтверждения: <strong>${verificationCode}</strong></p>
                <p>Код действителен в течение 10 минут.</p>
            `
        });

        res.json({ 
            success: true, 
            message: 'Код подтверждения отправлен на email',
            token: tempToken 
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.json({ success: false, message: 'Ошибка сервера' });
    }
});

// API: Подтверждение email
app.post('/api/verify', async (req, res) => {
    const { email, code, token } = req.body;

    try {
        const pendingData = PENDING_VERIFICATIONS.get(email);
        
        if (!pendingData) {
            return res.json({ success: false, message: 'Недействительный запрос' });
        }

        if (Date.now() > pendingData.expires) {
            PENDING_VERIFICATIONS.delete(email);
            return res.json({ success: false, message: 'Код истек' });
        }

        if (pendingData.code !== code) {
            return res.json({ success: false, message: 'Неверный код' });
        }

        // Создание пользователя
        const users = readUsers();
        const user = {
            id: Date.now().toString(),
            username: pendingData.username,
            email: pendingData.email,
            password: pendingData.password,
            verified: true,
            createdAt: new Date().toISOString()
        };

        users.push(user);
        writeUsers(users);

        // Генерация JWT токена
        const authToken = jwt.sign(
            { userId: user.id, email: user.email }, 
            JWT_SECRET, 
            { expiresIn: '30d' }
        );

        // Очистка временных данных
        PENDING_VERIFICATIONS.delete(email);

        res.json({
            success: true,
            message: 'Аккаунт успешно создан',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                token: authToken
            }
        });

    } catch (error) {
        console.error('Verification error:', error);
        res.json({ success: false, message: 'Ошибка верификации' });
    }
});

// API: Повторная отправка кода
app.post('/api/resend-code', async (req, res) => {
    const { email, token } = req.body;

    try {
        const pendingData = PENDING_VERIFICATIONS.get(email);
        
        if (!pendingData) {
            return res.json({ success: false, message: 'Недействительный запрос' });
        }

        // Генерация нового кода
        const newCode = generateVerificationCode();
        pendingData.code = newCode;
        pendingData.expires = Date.now() + 10 * 60 * 1000;

        // Отправка email
        await transporter.sendMail({
            from: '"TwoAnimations" <noreply@twoanimations.com>',
            to: email,
            subject: 'Новый код подтверждения',
            html: `
                <h2>Ваш новый код подтверждения</h2>
                <p>Код: <strong>${newCode}</strong></p>
                <p>Код действителен в течение 10 минут.</p>
            `
        });

        res.json({ success: true, message: 'Код отправлен повторно' });

    } catch (error) {
        console.error('Resend code error:', error);
        res.json({ success: false, message: 'Ошибка отправки кода' });
    }
});

app.listen(PORT, () => {
    initUsersFile();
    console.log(`Server running on port ${PORT}`);
});
