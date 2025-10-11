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
}

// Показ уведомлений
function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    const container = document.querySelector('.glass-card');
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
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
    
    // Проверяем, есть ли параметр подтверждения email в URL
    checkEmailVerification();
});

// Обработка регистрации
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
    
    try {
        const registerBtn = e.target.querySelector('.btn-primary');
        registerBtn.textContent = 'Создание аккаунта...';
        registerBtn.disabled = true;

        // Создаем пользователя в Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        currentUser = userCredential.user;
        
        // Сохраняем дополнительную информацию в Firestore
        await db.collection('users').doc(currentUser.uid).set({
            username: name,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            emailVerified: false,
            displayName: name
        });
        
        // Отправляем email для подтверждения
        await currentUser.sendEmailVerification();
        
        // Показываем сообщение о подтверждении
        showForm('verify-form');
        document.getElementById('user-email').textContent = email;
        
        showAlert('Ссылка для подтверждения отправлена на ваш email! Проверьте почту.');
        
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        showAlert('Ошибка регистрации: ' + error.message, 'error');
    } finally {
        const registerBtn = document.querySelector('#registerForm .btn-primary');
        if (registerBtn) {
            registerBtn.textContent = 'Создать аккаунт';
            registerBtn.disabled = false;
        }
    }
}

// Обработка входа
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
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
        
        // Сохраняем информацию о пользователе в localStorage
        localStorage.setItem('userLoggedIn', 'true');
        localStorage.setItem('userEmail', user.email);
        
        // Перенаправление на защищенную страницу
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
        
    } catch (error) {
        console.error('Ошибка входа:', error);
        showAlert('Ошибка входа: ' + error.message, 'error');
    } finally {
        const loginBtn = document.querySelector('#loginForm .btn-primary');
        if (loginBtn) {
            loginBtn.textContent = 'Войти';
            loginBtn.disabled = false;
        }
    }
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
                
                // Если мы на странице регистрации, перенаправляем на вход
                if (window.location.pathname.includes('register.html')) {
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 3000);
                }
            }
        }
    });
}

// Выход из системы
function logout() {
    auth.signOut().then(() => {
        localStorage.removeItem('userLoggedIn');
        localStorage.removeItem('userEmail');
        window.location.href = 'index.html';
    });
}

// Проверка авторизации при загрузке страницы
function checkAuth() {
    auth.onAuthStateChanged((user) => {
        if (user && user.emailVerified) {
            // Пользователь авторизован и email подтвержден
            console.log('Пользователь авторизован:', user.email);
        }
    });
}

// Инициализация проверки авторизации
checkAuth();
