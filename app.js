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
    const targetForm = document.getElementById(formId);
    if (targetForm) {
        targetForm.classList.add('active');
    }
    
    // Обновляем активную кнопку переключателя (только для index.html)
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
    // Удаляем существующие уведомления
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

// Обработка регистрации
async function handleRegister(e) {
    e.preventDefault();
    console.log('Начало регистрации...');
    
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm').value;
    
    console.log('Данные формы:', { name, email, password, confirmPassword });
    
    // Валидация
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

        console.log('Проверка уникальности username...');
        // Проверяем уникальность username
        const usernameExists = await checkUsernameExists(name.toLowerCase().trim());
        if (usernameExists) {
            showAlert('Такое имя пользователя уже занято', 'error');
            return;
        }

        console.log('Создание пользователя в Firebase Auth...');
        // Создаем пользователя в Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        currentUser = userCredential.user;
        console.log('Пользователь создан:', currentUser.uid);
        
        console.log('Сохранение данных в Firestore...');
        // Сохраняем дополнительную информацию в Firestore
        await db.collection('users').doc(currentUser.uid).set({
            username: name.toLowerCase().trim(),
            email: email,
            displayName: name,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            emailVerified: false
        });
        console.log('Данные сохранены в Firestore');
        
        console.log('Отправка email подтверждения...');
        // Отправляем email для подтверждения
        await currentUser.sendEmailVerification();
        console.log('Email подтверждения отправлен');
        
        // Показываем сообщение о подтверждении
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
            // Обновляем информацию о пользователе
            await user.reload();
            
            if (user.emailVerified) {
                showAlert('Email успешно подтвержден! Теперь вы можете войти в аккаунт.', 'success');
                
                // Обновляем статус в Firestore
                try {
                    await db.collection('users').doc(user.uid).update({
                        emailVerified: true,
                        emailVerifiedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } catch (error) {
                    console.error('Ошибка обновления статуса:', error);
                }
                
                // Если мы на странице регистрации, перенаправляем на вход через 3 секунды
                if (window.location.pathname.includes('register.html')) {
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 3000);
                }
            }
        }
    });
}

// Проверка авторизации
// Проверка авторизации - ИСПРАВЛЕННАЯ ВЕРСИЯ
// Проверка авторизации - ИСПРАВЛЕННАЯ ВЕРСИЯ
function checkAuth() {
    auth.onAuthStateChanged((user) => {
        if (user && user.emailVerified) {
            // Если пользователь уже авторизован и на странице входа, перенаправляем на dashboard
            if (window.location.pathname.includes('index.html') || 
                window.location.pathname.endsWith('/')) {
                // Проверяем, что мы еще не на dashboard, чтобы избежать цикла
                if (!window.location.pathname.includes('dashboard.html')) {
                    window.location.href = 'dashboard.html';
                }
            }
        } else if (!user) {
            // Если пользователь не авторизован и на dashboard, перенаправляем на вход
            if (window.location.pathname.includes('dashboard.html')) {
                window.location.href = 'index.html';
            }
        }
    });
}

// Функция для создания аватара пользователя на всех страницах - ИСПРАВЛЕННАЯ ВЕРСИЯ
function createUserAvatarOnAllPages() {
    auth.onAuthStateChanged(async (user) => {
        if (user && user.emailVerified) {
            // Загружаем данные пользователя
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                createAvatarElement(userData, user.email);
            }
        } else {
            // Если пользователь не авторизован, удаляем аватар если он есть
            const existingAvatar = document.querySelector('.user-avatar');
            const existingMenu = document.querySelector('.user-menu');
            
            if (existingAvatar) existingAvatar.remove();
            if (existingMenu) existingMenu.remove();
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

// Функции для работы с личным кабинетом
class UserDashboard {
    constructor() {
        this.user = null;
        this.userData = null;
        this.init();
    }

    async init() {
        await this.checkAuth();
        this.loadUserData();
        this.createUserAvatar();
    }

    async checkAuth() {
        return new Promise((resolve) => {
            auth.onAuthStateChanged(async (user) => {
                if (user && user.emailVerified) {
                    this.user = user;
                    await this.loadUserProfile();
                    resolve(true);
                } else {
                    // Если пользователь не авторизован, перенаправляем на вход
                    window.location.href = 'index.html';
                    resolve(false);
                }
            });
        });
    }

    async loadUserProfile() {
        try {
            const userDoc = await db.collection('users').doc(this.user.uid).get();
            if (userDoc.exists) {
                this.userData = userDoc.data();
                this.updateDashboard();
            }
        } catch (error) {
            console.error('Ошибка загрузки профиля:', error);
        }
    }

    updateDashboard() {
        // Обновляем аватар
        this.updateAvatar();
        
        // Обновляем информацию на странице
        if (this.userData) {
            // Основная информация
            document.getElementById('profile-username').textContent = this.userData.displayName || this.userData.username || 'Пользователь';
            document.getElementById('profile-email').textContent = this.user.email;
            
            // Детальная информация
            document.getElementById('info-username').textContent = this.userData.displayName || this.userData.username || '-';
            document.getElementById('info-email').textContent = this.user.email;
            document.getElementById('info-userid').textContent = this.user.uid;
            
            // Статус email
            const emailStatus = document.getElementById('info-email-status');
            if (this.user.emailVerified) {
                emailStatus.textContent = '✓ Подтвержден';
                emailStatus.className = 'status-verified';
            } else {
                emailStatus.textContent = '⏳ Ожидает подтверждения';
                emailStatus.className = 'status-pending';
            }
            
            // Дата регистрации
            if (this.userData.createdAt) {
                const joinDate = this.userData.createdAt.toDate();
                document.getElementById('info-joined').textContent = joinDate.toLocaleDateString('ru-RU');
                
                // Расчет дней с регистрации
                const daysSinceJoin = Math.floor((new Date() - joinDate) / (1000 * 60 * 60 * 24));
                document.getElementById('stat-joined').textContent = daysSinceJoin;
            }
            
            // Заглушки для статистики
            document.getElementById('stat-projects').textContent = '0';
            document.getElementById('stat-activity').textContent = '100%';
        }
    }

    updateAvatar() {
        const username = this.userData?.displayName || this.userData?.username || 'User';
        const initials = this.getInitials(username);
        
        // Обновляем большой аватар на странице
        const largeAvatar = document.getElementById('profile-avatar-large');
        if (largeAvatar) {
            largeAvatar.textContent = initials;
        }
        
        // Обновляем аватар в углу
        const cornerAvatar = document.querySelector('.user-avatar');
        if (cornerAvatar) {
            cornerAvatar.textContent = initials;
        }
    }

    getInitials(name) {
        return name.split(' ')
            .map(part => part.charAt(0).toUpperCase())
            .join('')
            .substring(0, 2);
    }

    createUserAvatar() {
        // Создаем аватар в правом верхнем углу
        const avatar = document.createElement('div');
        avatar.className = 'user-avatar';
        avatar.innerHTML = this.getInitials(this.userData?.displayName || 'UA');
        avatar.onclick = (e) => {
            e.stopPropagation();
            this.toggleUserMenu();
        };
        
        document.body.appendChild(avatar);
        
        // Создаем меню пользователя
        this.createUserMenu();
        
        // Закрытие меню при клике вне его
        document.addEventListener('click', () => {
            this.hideUserMenu();
        });
    }

    createUserMenu() {
        const menu = document.createElement('div');
        menu.className = 'user-menu';
        menu.innerHTML = `
            <div class="user-info">
                <div class="username">${this.userData?.displayName || 'Пользователь'}</div>
                <div class="email">${this.user.email}</div>
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
        this.userMenu = menu;
    }

    toggleUserMenu() {
        if (this.userMenu.classList.contains('active')) {
            this.hideUserMenu();
        } else {
            this.showUserMenu();
        }
    }

    showUserMenu() {
        this.userMenu.classList.add('active');
    }

    hideUserMenu() {
        this.userMenu.classList.remove('active');
    }

    loadUserData() {
        // Дополнительная загрузка данных пользователя
        console.log('Данные пользователя загружены:', this.userData);
    }
}

// Глобальные функции
function editProfile() {
    alert('Функция редактирования профиля в разработке');
}

function logout() {
    auth.signOut().then(() => {
        localStorage.removeItem('userLoggedIn');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('username');
        window.location.href = 'index.html';
    });
}

// Инициализация дашборда когда DOM загружен
document.addEventListener('DOMContentLoaded', () => {
    new UserDashboard();
});

// Функция для адаптации высоты контента
function adjustContentHeight() {
    const container = document.querySelector('.container');
    const glassCard = document.querySelector('.glass-card');
    
    if (container && glassCard) {
        const viewportHeight = window.innerHeight;
        const containerTop = container.getBoundingClientRect().top;
        const availableHeight = viewportHeight - containerTop - 40; // 40px отступ снизу
        
        // Устанавливаем максимальную высоту для контента
        glassCard.style.maxHeight = availableHeight + 'px';
        glassCard.style.overflowY = 'auto';
    }
}

// Вызываем при загрузке и изменении размера окна
window.addEventListener('load', adjustContentHeight);
window.addEventListener('resize', adjustContentHeight);

// Также вызываем когда контент динамически меняется
setTimeout(adjustContentHeight, 100);
