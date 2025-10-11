// Конфигурация Firebase - ЗАМЕНИТЕ на свои данные
const firebaseConfig = {
 apiKey: "AIzaSyC5XKTbkLrz-UglKyQ4LMhGQbETEgj848Y",
 authDomain: "twoanimations-272f9.firebaseapp.com",
 projectId: "twoanimations-272f9",
 storageBucket: "twoanimations-272f9.firebasestorage.app",
 messagingSenderId: "558163948231",
 appId: "1:558163948231:web:9f14867c526d4888f3c4e2",
 measurementId: "G-5XJZTCYWCB"
};

// Инициализация Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// Глобальные переменные
let confirmationResult = null;
let currentUserEmail = '';

// Функции для работы с формами
function showForm(formId) {
    document.querySelectorAll('.form-container').forEach(form => {
        form.classList.remove('active');
    });
    document.getElementById(formId).classList.add('active');
}

// Регистрация
document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Обработчики для подтверждения email
    const verifyBtn = document.getElementById('verify-btn');
    const resendBtn = document.getElementById('resend-btn');
    
    if (verifyBtn) {
        verifyBtn.addEventListener('click', verifyEmail);
    }
    
    if (resendBtn) {
        resendBtn.addEventListener('click', resendVerification);
    }
});

// Обработка регистрации
async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm').value;
    
    if (password !== confirmPassword) {
        alert('Пароли не совпадают!');
        return;
    }
    
    if (password.length < 6) {
        alert('Пароль должен содержать минимум 6 символов!');
        return;
    }
    
    try {
        // Создаем пользователя в Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Сохраняем дополнительную информацию в Firestore
        await db.collection('users').doc(user.uid).set({
            username: name,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            emailVerified: false
        });
        
        // Отправляем email для подтверждения
        await user.sendEmailVerification();
        
        currentUserEmail = email;
        showForm('verify-form');
        document.getElementById('user-email').textContent = email;
        
        alert('Код подтверждения отправлен на ваш email!');
        
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        alert('Ошибка регистрации: ' + error.message);
    }
}

// Обработка входа
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        if (!user.emailVerified) {
            alert('Пожалуйста, подтвердите ваш email перед входом.');
            await auth.signOut();
            return;
        }
        
        // Успешный вход
        alert('Вход выполнен успешно!');
        // Перенаправление на главную страницу
        window.location.href = 'https://twoanimations.github.io/MainWebsite/dashboard';
        
    } catch (error) {
        console.error('Ошибка входа:', error);
        alert('Ошибка входа: ' + error.message);
    }
}

// Подтверждение email
async function verifyEmail() {
    const code = document.getElementById('verify-code').value;
    
    if (!code) {
        alert('Введите код подтверждения!');
        return;
    }
    
    try {
        // В реальном приложении здесь была бы проверка кода
        // Для демонстрации просто отмечаем email как подтвержденный
        const user = auth.currentUser;
        
        if (user) {
            // Обновляем статус в Firestore
            await db.collection('users').doc(user.uid).update({
                emailVerified: true
            });
            
            alert('Email успешно подтвержден! Теперь вы можете войти в аккаунт.');
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Ошибка подтверждения:', error);
        alert('Ошибка подтверждения: ' + error.message);
    }
}

// Повторная отправка кода подтверждения
async function resendVerification() {
    const user = auth.currentUser;
    
    if (user) {
        try {
            await user.sendEmailVerification();
            alert('Код подтверждения отправлен повторно!');
        } catch (error) {
            console.error('Ошибка отправки:', error);
            alert('Ошибка отправки: ' + error.message);
        }
    }
}

// Проверка состояния аутентификации
auth.onAuthStateChanged((user) => {
    if (user && user.emailVerified) {
        // Пользователь авторизован и email подтвержден
        console.log('Пользователь авторизован:', user.email);
    }
});
