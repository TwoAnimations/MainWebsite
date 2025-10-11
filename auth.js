// auth.js
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        // Проверяем авторизацию при загрузке
        this.checkAuth();
        
        // Обработчики форм
        const registerForm = document.getElementById('registration-form');
        const verifyForm = document.getElementById('verification-form');
        const resendBtn = document.getElementById('resend-code');

        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        if (verifyForm) {
            verifyForm.addEventListener('submit', (e) => this.handleVerification(e));
        }

        if (resendBtn) {
            resendBtn.addEventListener('click', (e) => this.resendCode(e));
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const formData = {
            username: document.getElementById('register-name').value,
            email: document.getElementById('register-email').value,
            password: document.getElementById('register-password').value,
            confirmPassword: document.getElementById('register-confirm').value
        };

        // Валидация
        if (formData.password !== formData.confirmPassword) {
            this.showError('Пароли не совпадают');
            return;
        }

        if (formData.password.length < 6) {
            this.showError('Пароль должен содержать минимум 6 символов');
            return;
        }

        try {
            const btn = document.getElementById('register-btn');
            btn.disabled = true;
            btn.textContent = 'Отправка...';

            // Отправляем данные на сервер
            const response = await this.sendToBackend('/api/register', formData);
            
            if (response.success) {
                // Переключаем на форму подтверждения
                this.showVerificationForm(formData.email);
                this.pendingRegistration = formData;
                this.pendingToken = response.token;
            } else {
                this.showError(response.message);
            }
        } catch (error) {
            this.showError('Ошибка соединения с сервером');
        } finally {
            const btn = document.getElementById('register-btn');
            btn.disabled = false;
            btn.textContent = 'Создать аккаунт';
        }
    }

    async handleVerification(e) {
        e.preventDefault();
        
        const code = document.getElementById('verification-code').value;
        
        if (!code || code.length !== 6) {
            this.showError('Введите корректный код');
            return;
        }

        try {
            const response = await this.sendToBackend('/api/verify', {
                email: this.pendingRegistration.email,
                code: code,
                token: this.pendingToken
            });

            if (response.success) {
                this.showSuccess('Аккаунт успешно создан!');
                // Сохраняем данные пользователя
                this.saveUserData(response.user);
                // Перенаправляем на главную страницу
                setTimeout(() => {
                    window.location.href = 'https://twoanimations.github.io/MainWebsite/index.html';
                }, 2000);
            } else {
                this.showError(response.message);
            }
        } catch (error) {
            this.showError('Ошибка верификации');
        }
    }

    async resendCode(e) {
        e.preventDefault();
        
        try {
            const response = await this.sendToBackend('/api/resend-code', {
                email: this.pendingRegistration.email,
                token: this.pendingToken
            });

            if (response.success) {
                this.showSuccess('Код отправлен повторно');
            } else {
                this.showError('Ошибка отправки кода');
            }
        } catch (error) {
            this.showError('Ошибка соединения');
        }
    }

    showVerificationForm(email) {
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('verify-form').style.display = 'block';
        
        // Обновляем текст с email
        const emailText = document.querySelector('#verify-form p');
        if (emailText) {
            emailText.textContent = `Мы отправили код подтверждения на ${email}`;
        }
    }

    async sendToBackend(endpoint, data) {
        // Для GitHub Pages используем внешний сервер
        const API_BASE = 'https://your-backend-server.com'; // Замените на ваш сервер
        
        const response = await fetch(API_BASE + endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        return await response.json();
    }

    saveUserData(user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('authToken', user.token);
        this.currentUser = user;
    }

    checkAuth() {
        const user = localStorage.getItem('currentUser');
        const token = localStorage.getItem('authToken');
        
        if (user && token) {
            this.currentUser = JSON.parse(user);
        }
    }

    showError(message) {
        // Простая реализация показа ошибок
        alert('Ошибка: ' + message);
    }

    showSuccess(message) {
        alert('Успех: ' + message);
    }
}

// Инициализация системы при загрузке
document.addEventListener('DOMContentLoaded', () => {
    new AuthSystem();
});
