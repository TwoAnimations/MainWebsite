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
let authChecked = false;

// Защита от циклических редиректов
let redirectInProgress = false;

function safeRedirect(url) {
    if (!redirectInProgress && window.location.href !== url) {
        redirectInProgress = true;
        window.location.href = url;
    }
}

// Функции для работы с формами
function showForm(formId) {
    document.querySelectorAll('.form-container').forEach(form => {
        form.classList.remove('active');
    });
    const targetForm = document.getElementById(formId);
    if (targetForm) {
        targetForm.classList.add('active');
    }
    
    if (formId === 'login-email-form' || formId === 'login-username-form') {
        document.querySelectorAll('.switch-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`[data-form="${formId}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }
}

// Показ уведомлений
function showAlert(message, type = 'success') {
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    const container = document.querySelector('.glass-card');
    if (container) {
        container.insertBefore(alertDiv, container.firstChild);
        
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing...');
    
    // Обработчики форм входа (только для index.html)
    const loginEmailForm = document.getElementById('loginEmailForm');
    const loginUsernameForm = document.getElementById('loginUsernameForm');
    
    if (loginEmailForm) {
        loginEmailForm.addEventListener('submit', handleLoginEmail);
    }
    
    if (loginUsernameForm) {
        loginUsernameForm.addEventListener('submit', handleLoginUsername);
    }
    
    // Обработчики переключателя форм (только для index.html)
    document.querySelectorAll('.switch-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const formId = this.getAttribute('data-form');
            showForm(formId);
        });
    });
    
    // Обработчики для страницы регистрации
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    const resendBtn = document.getElementById('resend-btn');
    if (resendBtn) {
        resendBtn.addEventListener('click', resendVerification);
    }
    
    // Проверяем авторизацию
    checkAuth();
    
    // Проверяем подтверждение email
    checkEmailVerification();
    
    // Создаем аватар если пользователь авторизован
    createUserAvatarOnAllPages();
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
        
        showAlert('Вход выполнен успешно!', 'success');
        
        localStorage.setItem('userLoggedIn', 'true');
        localStorage.setItem('userEmail', user.email);
        
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            localStorage.setItem('username', userData.username || '');
        }
        
        setTimeout(() => {
            safeRedirect('dashboard.html');
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
        
        const userCredential = await auth.signInWithEmailAndPassword(userEmail, password);
        const user = userCredential.user;
        
        if (!user.emailVerified) {
            showAlert('Пожалуйста, подтвердите ваш email перед входом. Проверьте вашу почту.', 'error');
            await auth.signOut();
            return;
        }
        
        showAlert('Вход выполнен успешно!', 'success');
        
        localStorage.setItem('userLoggedIn', 'true');
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('username', username);
        
        setTimeout(() => {
            safeRedirect('dashboard.html');
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
    
    if (!name || !email) {
        showAlert('Пожалуйста, заполните все поля', 'error');
        return;
    }
    
    try {
        const registerBtn = e.target.querySelector('.btn-primary');
        registerBtn.textContent = 'Создание аккаунта...';
        registerBtn.disabled = true;

        const usernameExists = await checkUsernameExists(name.toLowerCase().trim());
        if (usernameExists) {
            showAlert('Такое имя пользователя уже занято', 'error');
            return;
        }

        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        currentUser = userCredential.user;
        
        await db.collection('users').doc(currentUser.uid).set({
            username: name.toLowerCase().trim(),
            email: email,
            displayName: name,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            emailVerified: false
        });
        
        await currentUser.sendEmailVerification();
        
        showForm('verify-form');
        const userEmailElement = document.getElementById('user-email');
        if (userEmailElement) {
            userEmailElement.textContent = email;
        }
        
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
            case 'auth/network-request-failed':
                errorMessage += 'Ошибка сети. Проверьте подключение к интернету';
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
    try {
        const snapshot = await db.collection('users')
            .where('username', '==', username)
            .limit(1)
            .get();
        return !snapshot.empty;
    } catch (error) {
        console.error('Ошибка проверки username:', error);
        return false;
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
        if (resendBtn) {
            resendBtn.textContent = 'Отправка...';
            resendBtn.disabled = true;
        }

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
            await user.reload();
            
            if (user.emailVerified) {
                showAlert('Email успешно подтвержден! Теперь вы можете войти в аккаунт.', 'success');
                
                try {
                    await db.collection('users').doc(user.uid).update({
                        emailVerified: true,
                        emailVerifiedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } catch (error) {
                    console.error('Ошибка обновления статуса:', error);
                }
            }
        }
    });
}

// Проверка авторизации
function checkAuth() {
    if (authChecked) return;
    
    auth.onAuthStateChanged((user) => {
        authChecked = true;
        
        if (user && user.emailVerified) {
            if ((window.location.pathname.includes('index.html') || 
                 window.location.pathname.endsWith('/')) &&
                !window.location.pathname.includes('dashboard.html')) {
                setTimeout(() => {
                    safeRedirect('dashboard.html');
                }, 1000);
            }
        } else if (!user) {
            if (window.location.pathname.includes('dashboard.html')) {
                setTimeout(() => {
                    safeRedirect('index.html');
                }, 1000);
            }
        }
    });
}

// Функция для создания аватара пользователя на всех страницах
function createUserAvatarOnAllPages() {
    auth.onAuthStateChanged(async (user) => {
        if (user && user.emailVerified) {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                createAvatarElement(userData, user.email);
            }
        } else {
            const existingAvatar = document.querySelector('.user-avatar');
            const existingMenu = document.querySelector('.user-menu');
            
            if (existingAvatar) existingAvatar.remove();
            if (existingMenu) existingMenu.remove();
        }
    });
}

function createAvatarElement(userData, email) {
    const existingAvatar = document.querySelector('.user-avatar');
    if (existingAvatar) {
        existingAvatar.remove();
    }
    
    const existingMenu = document.querySelector('.user-menu');
    if (existingMenu) {
        existingMenu.remove();
    }

    const username = userData?.displayName || userData?.username || 'User';
    const initials = getInitials(username);
    
    const avatar = document.createElement('div');
    avatar.className = 'user-avatar';
    avatar.innerHTML = initials;
    avatar.onclick = (e) => {
        e.stopPropagation();
        toggleUserMenu();
    };
    
    document.body.appendChild(avatar);
    
    const menu = document.createElement('div');
    menu.className = 'user-menu';
    menu.innerHTML = `
        <div class="user-info">
            <div class="username">${username}</div>
            <div class="email">${email}</div>
        </div>
        <div class="menu-divider"></div>
        <button class="menu-item" onclick="window.location.href='dashboard.html'">
            <i>👤</i> Личный кабинет
        </button>
        <button class="menu-item" onclick="editProfile()">
            <i>⚙️</i> Настройки
        </button>
        <div class="menu-divider"></div>
        <button class="menu-item" onclick="logout()">
            <i>🚪</i> Выйти
        </button>
    `;
    
    document.body.appendChild(menu);
    
    function toggleUserMenu() {
        menu.classList.toggle('active');
    }
    
    function hideUserMenu() {
        menu.classList.remove('active');
    }
    
    document.addEventListener('click', hideUserMenu);
    menu.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

function getInitials(name) {
    return name.split(' ')
        .map(part => part.charAt(0).toUpperCase())
        .join('')
        .substring(0, 2);
}

// Глобальные функции
function editProfile() {
    alert('Функция редактирования профиля в разработке');
}

function logout() {
    if (confirm('Вы уверены, что хотите выйти?')) {
        auth.signOut().then(() => {
            localStorage.removeItem('userLoggedIn');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('username');
            safeRedirect('index.html');
        });
    }
}

// Функция для адаптации высоты контента
function adjustContentHeight() {
    const glassCard = document.querySelector('.glass-card');
    if (glassCard) {
        glassCard.style.overflowY = 'auto';
        glassCard.style.maxHeight = 'none';
    }
}

window.addEventListener('load', function() {
    setTimeout(adjustContentHeight, 100);
});
