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
let currentUser = null;

// Функции для работы с формами
function showForm(formId) {
    document.querySelectorAll('.form-container').forEach(form => {
        form.classList.remove('active');
    });
    document.getElementById(formId).classList.add('active');
    
    // Обновляем активную кнопку переключателя
    document.querySelectorAll('.switch-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (formId === 'login-email-form') {
        document.querySelector('[data-form="login-email-form"]').classList.add('active');
    } else if (formId === 'login-username-form') {
        document.querySelector('[data-form="login-username-form"]').classList.add('active');
    }
}

// Показ уведомлений
function showAlert(message, type = 'success') {
    // Удаляем существующие уведомления
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    const container = document.querySelector('.glass-card');
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Обработчики форм входа
    const loginEmailForm = document.getElementById('loginEmailForm');
    const loginUsernameForm = document.getElementById('loginUsernameForm');
    
    if (loginEmailForm) {
        loginEmailForm.addEventListener('submit', handleLoginEmail);
    }
    
    if (loginUsernameForm) {
        loginUsernameForm.addEventListener('submit', handleLoginUsername);
    }
    
    // Обработчики переключателя форм
    document.querySelectorAll('.switch-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const formId = this.getAttribute('data-form');
            showForm(formId);
        });
    });
    
    // Обработчик повторной отправки подтверждения
    const resendBtn = document.getElementById('resend-btn');
    if (resendBtn) {
        resendBtn.addEventListener('click', resendVerification);
    }
    
    // Проверяем, есть ли параметр подтверждения email в URL
    checkEmailVerification();
    
    // Проверяем авторизацию
    checkAuth();
});

// Вход по Email
async function handleLoginEmail(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        showAlert('Пожалуйста, заполните все поля', 'error');
        return;
    }
    
    try {
        const loginBtn = e.target.querySelector('.btn-primary');
        loginBtn.textContent = 'Вход...';
        loginBtn.disabled = true;

        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        if (!user.emailVerified) {
            showAlert('Пожалуйста, подтвердите ваш email перед входом. Проверьте вашу почту.', 'error');
            await auth.signOut();
            return;
        }
        
        // Успешный вход
        showAlert('Вход выполнен успешно!', 'success');
        
        // Сохраняем информацию о пользователе
        localStorage.setItem('userLoggedIn', 'true');
        localStorage.setItem('userEmail', user.email);
        
        // Получаем дополнительную информацию о пользователе
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            localStorage.setItem('username', userData.username || '');
        }
        
        // Перенаправление на защищенную страницу
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
        
    } catch (error) {
        console.error('Ошибка входа:', error);
        
        let errorMessage = 'Ошибка входа: ';
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage += 'Пользователь с таким email не найден';
                break;
            case 'auth/wrong-password':
                errorMessage += 'Неверный пароль';
                break;
            case 'auth/invalid-email':
                errorMessage += 'Неверный формат email';
                break;
            default:
                errorMessage += error.message;
        }
        
        showAlert(errorMessage, 'error');
    } finally {
        const loginBtn = document.querySelector('#loginEmailForm .btn-primary');
        if (loginBtn) {
            loginBtn.textContent = 'Войти';
            loginBtn.disabled = false;
        }
    }
}

// Вход по Имени пользователя
async function handleLoginUsername(e) {
    e.preventDefault();
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password-username').value;
    
    if (!username || !password) {
        showAlert('Пожалуйста, заполните все поля', 'error');
        return;
    }
    
    try {
        const loginBtn = e.target.querySelector('.btn-primary');
        loginBtn.textContent = 'Вход...';
        loginBtn.disabled = true;

        // Ищем пользователя по username в Firestore
        const usersSnapshot = await db.collection('users')
            .where('username', '==', username.toLowerCase().trim())
            .limit(1)
            .get();
        
        if (usersSnapshot.empty) {
            showAlert('Пользователь с таким именем не найден', 'error');
            return;
        }
        
        const userDoc = usersSnapshot.docs[0];
        const userData = userDoc.data();
        const userEmail = userData.email;
        
        // Пытаемся войти с найденным email
        const userCredential = await auth.signInWithEmailAndPassword(userEmail, password);
        const user = userCredential.user;
        
        if (!user.emailVerified) {
            showAlert('Пожалуйста, подтвердите ваш email перед входом. Проверьте вашу почту.', 'error');
            await auth.signOut();
            return;
        }
        
        // Успешный вход
        showAlert('Вход выполнен успешно!', 'success');
        
        // Сохраняем информацию о пользователе
        localStorage.setItem('userLoggedIn', 'true');
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('username', username);
        
        // Перенаправление на защищенную страницу
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
        
    } catch (error) {
        console.error('Ошибка входа:', error);
        
        let errorMessage = 'Ошибка входа: ';
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage += 'Пользователь не найден';
                break;
            case 'auth/wrong-password':
                errorMessage += 'Неверный пароль';
                break;
            case 'auth/invalid-email':
                errorMessage += 'Ошибка в данных пользователя';
                break;
            default:
                errorMessage += error.message;
        }
        
        showAlert(errorMessage, 'error');
    } finally {
        const loginBtn = document.querySelector('#loginUsernameForm .btn-primary');
        if (loginBtn) {
            loginBtn.textContent = 'Войти';
            loginBtn.disabled = false;
        }
    }
}

// Обработка регистрации (для register.html)
async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm').value;
    
    if (password !== confirmPassword) {
        showAlert('Пароли не совпадают!', 'error');
        return;
    }
    
    if (password.length < 6) {
        showAlert('Пароль должен содержать минимум 6 символов!', 'error');
        return;
    }
    
    // Проверяем уникальность username
    const usernameExists = await checkUsernameExists(name.toLowerCase().trim());
    if (usernameExists) {
        showAlert('Такое имя пользователя уже занято', 'error');
        return;
    }
    
    try {
        const registerBtn = e.target.querySelector('.btn-primary');
        registerBtn.textContent = 'Создание аккаунта...';
        registerBtn.disabled = true;

        // Создаем пользователя в Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        currentUser = userCredential.user;
        
        // Сохраняем дополнительную информацию в Firestore
        await db.collection('users').doc(currentUser.uid).set({
            username: name.toLowerCase().trim(),
            email: email,
            displayName: name,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            emailVerified: false
        });
        
        // Отправляем email для подтверждения
        await currentUser.sendEmailVerification();
        
        // Показываем сообщение о подтверждении
        showForm('verify-form');
        document.getElementById('user-email').textContent = email;
        
        showAlert('Ссылка для подтверждения отправлена на ваш email! Проверьте почту.');
        
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        
        let errorMessage = 'Ошибка регистрации: ';
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage += 'Email уже используется';
                break;
            case 'auth/invalid-email':
                errorMessage += 'Неверный формат email';
                break;
            case 'auth/weak-password':
                errorMessage += 'Пароль слишком слабый';
                break;
            default:
                errorMessage += error.message;
        }
        
        showAlert(errorMessage, 'error');
    } finally {
        const registerBtn = document.querySelector('#registerForm .btn-primary');
        if (registerBtn) {
            registerBtn.textContent = 'Создать аккаунт';
            registerBtn.disabled = false;
        }
    }
}

// Проверка уникальности username
async function checkUsernameExists(username) {
    const snapshot = await db.collection('users')
        .where('username', '==', username)
        .limit(1)
        .get();
    return !snapshot.empty;
}

// Повторная отправка ссылки подтверждения
async function resendVerification() {
    if (!currentUser) {
        showAlert('Пользователь не найден', 'error');
        return;
    }
    
    try {
        const resendBtn = document.getElementById('resend-btn');
        resendBtn.textContent = 'Отправка...';
        resendBtn.disabled = true;

        await currentUser.sendEmailVerification();
        showAlert('Ссылка для подтверждения отправлена повторно! Проверьте вашу почту.');
        
    } catch (error) {
        console.error('Ошибка отправки:', error);
        showAlert('Ошибка отправки: ' + error.message, 'error');
    } finally {
        const resendBtn = document.getElementById('resend-btn');
        if (resendBtn) {
            resendBtn.textContent = 'Отправить ссылку повторно';
            resendBtn.disabled = false;
        }
    }
}

// Проверка подтверждения email по ссылке
function checkEmailVerification() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // Обновляем информацию о пользователе
            await user.reload();
            
            if (user.emailVerified) {
                showAlert('Email успешно подтвержден! Теперь вы можете войти в аккаунт.', 'success');
                
                // Обновляем статус в Firestore
                await db.collection('users').doc(user.uid).update({
                    emailVerified: true,
                    emailVerifiedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }
    });
}

// Проверка авторизации
function checkAuth() {
    auth.onAuthStateChanged((user) => {
        if (user && user.emailVerified) {
            // Если пользователь уже авторизован, перенаправляем на dashboard
            if (window.location.pathname.includes('index.html') || 
                window.location.pathname.endsWith('/')) {
                window.location.href = 'dashboard.html';
            }
        }
    });
}

// Выход из системы
function logout() {
    auth.signOut().then(() => {
        localStorage.removeItem('userLoggedIn');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('username');
        window.location.href = 'index.html';
    });
}
