// dashboard.js
class UserDashboard {
    constructor() {
        this.user = null;
        this.userData = null;
        this.initialized = false;
        this.init();
    }

    async init() {
        if (this.initialized) return;
        
        const isAuthenticated = await this.checkAuth();
        if (isAuthenticated) {
            this.loadUserData();
            this.createUserAvatar();
            this.initialized = true;
        }
    }

    async checkAuth() {
        return new Promise((resolve) => {
            auth.onAuthStateChanged(async (user) => {
                if (user && user.emailVerified) {
                    this.user = user;
                    await this.loadUserProfile();
                    resolve(true);
                } else {
                    if (!window.location.pathname.includes('index.html')) {
                        setTimeout(() => {
                            safeRedirect('index.html');
                        }, 1000);
                    }
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
        this.updateAvatar();
        
        if (this.userData) {
            document.getElementById('profile-username').textContent = this.userData.displayName || this.userData.username || 'Пользователь';
            document.getElementById('profile-email').textContent = this.user.email;
            
            document.getElementById('info-username').textContent = this.userData.displayName || this.userData.username || '-';
            document.getElementById('info-email').textContent = this.user.email;
            document.getElementById('info-userid').textContent = this.user.uid;
            document.getElementById('info-last-login').textContent = new Date().toLocaleString('ru-RU');
            
            const emailStatus = document.getElementById('info-email-status');
            if (this.user.emailVerified) {
                emailStatus.textContent = '✓ Подтвержден';
                emailStatus.className = 'status-verified';
            } else {
                emailStatus.textContent = '⏳ Ожидает подтверждения';
                emailStatus.className = 'status-pending';
            }
            
            if (this.userData.createdAt) {
                const joinDate = this.userData.createdAt.toDate();
                document.getElementById('info-joined').textContent = joinDate.toLocaleDateString('ru-RU');
                
                const daysSinceJoin = Math.floor((new Date() - joinDate) / (1000 * 60 * 60 * 24));
                document.getElementById('stat-joined').textContent = daysSinceJoin;
            }
            
            document.getElementById('stat-projects').textContent = '0';
            document.getElementById('stat-activity').textContent = '100%';
            document.getElementById('stat-level').textContent = '1';
        }
    }

    updateAvatar() {
        const username = this.userData?.displayName || this.userData?.username || 'User';
        const initials = this.getInitials(username);
        
        const largeAvatar = document.getElementById('profile-avatar-large');
        if (largeAvatar) {
            largeAvatar.textContent = initials;
        }
        
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
        const avatar = document.createElement('div');
        avatar.className = 'user-avatar';
        avatar.innerHTML = this.getInitials(this.userData?.displayName || 'UA');
        avatar.onclick = (e) => {
            e.stopPropagation();
            this.toggleUserMenu();
        };
        
        document.body.appendChild(avatar);
        this.createUserMenu();
        
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
        
        menu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
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
        console.log('Данные пользователя загружены:', this.userData);
    }
}

// Глобальные функции
function editProfile() {
    alert('Функция редактирования профиля в разработке');
}

function changePassword() {
    alert('Функция смены пароля в разработке');
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

// Инициализация дашборда
document.addEventListener('DOMContentLoaded', () => {
    new UserDashboard();
});

// Адаптация высоты
window.addEventListener('load', function() {
    setTimeout(adjustContentHeight, 100);
});
