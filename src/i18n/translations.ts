export type Language = 'ru' | 'en';

export const translations = {
  // Common
  'app.name': { ru: 'AFM DIGITAL', en: 'AFM DIGITAL' },
  'common.save': { ru: 'Сохранить', en: 'Save' },
  'common.cancel': { ru: 'Отмена', en: 'Cancel' },
  'common.delete': { ru: 'Удалить', en: 'Delete' },
  'common.edit': { ru: 'Редактировать', en: 'Edit' },
  'common.add': { ru: 'Добавить', en: 'Add' },
  'common.search': { ru: 'Поиск', en: 'Search' },
  'common.loading': { ru: 'Загрузка...', en: 'Loading...' },
  'common.noData': { ru: 'Нет данных', en: 'No data' },
  'common.actions': { ru: 'Действия', en: 'Actions' },
  'common.status': { ru: 'Статус', en: 'Status' },
  'common.name': { ru: 'Название', en: 'Name' },
  'common.email': { ru: 'Email', en: 'Email' },
  'common.password': { ru: 'Пароль', en: 'Password' },
  'common.submit': { ru: 'Отправить', en: 'Submit' },
  'common.back': { ru: 'Назад', en: 'Back' },
  'common.active': { ru: 'Активный', en: 'Active' },
  'common.inactive': { ru: 'Неактивный', en: 'Inactive' },
  'common.paused': { ru: 'Приостановлен', en: 'Paused' },

  // Auth
  'auth.login': { ru: 'Вход', en: 'Sign In' },
  'auth.signup': { ru: 'Регистрация', en: 'Sign Up' },
  'auth.logout': { ru: 'Выход', en: 'Sign Out' },
  'auth.loginTitle': { ru: 'Вход в AFM DIGITAL', en: 'Sign In to AFM DIGITAL' },
  'auth.loginSubtitle': { ru: 'Введите учетные данные для доступа к панели', en: 'Enter your credentials to access the dashboard' },
  'auth.noAccount': { ru: 'Нет аккаунта?', en: "Don't have an account?" },
  'auth.hasAccount': { ru: 'Уже есть аккаунт?', en: 'Already have an account?' },
  'auth.emailPlaceholder': { ru: 'email@example.com', en: 'email@example.com' },
  'auth.passwordPlaceholder': { ru: 'Минимум 6 символов', en: 'At least 6 characters' },
  'auth.invalidEmail': { ru: 'Некорректный email', en: 'Invalid email address' },
  'auth.passwordTooShort': { ru: 'Пароль должен быть не менее 6 символов', en: 'Password must be at least 6 characters' },
  'auth.signupSuccess': { ru: 'Аккаунт создан! Проверьте почту для подтверждения.', en: 'Account created! Check your email for confirmation.' },
  'auth.loginError': { ru: 'Ошибка входа. Проверьте данные.', en: 'Login failed. Check your credentials.' },
  'auth.userExists': { ru: 'Пользователь с таким email уже существует', en: 'User with this email already exists' },

  // Admin Setup
  'admin.setup.title': { ru: 'Создание аккаунта администратора', en: 'Create Admin Account' },
  'admin.setup.subtitle': { ru: 'AFM DIGITAL — Первоначальная настройка', en: 'AFM DIGITAL — Initial Setup' },
  'admin.setup.description': { ru: 'Создайте первый аккаунт администратора для управления платформой', en: 'Create the first admin account to manage the platform' },
  'admin.setup.creating': { ru: 'Создание...', en: 'Creating...' },
  'admin.setup.create': { ru: 'Создать аккаунт администратора', en: 'Create Admin Account' },
  'admin.setup.success': { ru: 'Аккаунт администратора создан', en: 'Admin account created' },
  'admin.setup.complete': { ru: 'Настройка администратора завершена', en: 'Admin setup complete' },

  // Navigation
  'nav.dashboard': { ru: 'Дашборд', en: 'Dashboard' },
  'nav.clients': { ru: 'Клиенты', en: 'Clients' },
  'nav.users': { ru: 'Пользователи', en: 'Users & Access' },
  'nav.sync': { ru: 'Синхронизация', en: 'Sync Monitor' },
  'nav.logs': { ru: 'Логи', en: 'Raw Logs' },
  'nav.audit': { ru: 'Аудит', en: 'Audit' },
  'nav.settings': { ru: 'Настройки', en: 'Settings' },
  'nav.reports': { ru: 'Отчёты', en: 'Reports' },

  // Dashboard
  'dashboard.title': { ru: 'Панель управления', en: 'Dashboard' },
  'dashboard.welcome': { ru: 'Добро пожаловать', en: 'Welcome' },
  'dashboard.totalSpend': { ru: 'Общие расходы', en: 'Total Spend' },
  'dashboard.totalLeads': { ru: 'Всего лидов', en: 'Total Leads' },
  'dashboard.totalClicks': { ru: 'Всего кликов', en: 'Total Clicks' },
  'dashboard.totalImpressions': { ru: 'Показы', en: 'Impressions' },
  'dashboard.costPerLead': { ru: 'Стоимость лида', en: 'Cost per Lead' },
  'dashboard.ctr': { ru: 'CTR', en: 'CTR' },
  'dashboard.activeClients': { ru: 'Активные клиенты', en: 'Active Clients' },
  'dashboard.activeCampaigns': { ru: 'Активные кампании', en: 'Active Campaigns' },
  'dashboard.syncStatus': { ru: 'Данные могут обновляться с задержкой.', en: 'Data may be delayed.' },
  'dashboard.performance': { ru: 'Эффективность', en: 'Performance' },
  'dashboard.spendByPlatform': { ru: 'Расходы по платформам', en: 'Spend by Platform' },
  'dashboard.recentActivity': { ru: 'Последняя активность', en: 'Recent Activity' },

  // Clients
  'clients.title': { ru: 'Клиенты', en: 'Clients' },
  'clients.addClient': { ru: 'Добавить клиента', en: 'Add Client' },
  'clients.clientName': { ru: 'Имя клиента', en: 'Client Name' },
  'clients.platforms': { ru: 'Платформы', en: 'Platforms' },
  'clients.spend': { ru: 'Расходы', en: 'Spend' },
  'clients.leads': { ru: 'Лиды', en: 'Leads' },
  'clients.cpl': { ru: 'CPL', en: 'CPL' },
  'clients.lastSync': { ru: 'Последняя синхронизация', en: 'Last Sync' },

  // Users
  'users.title': { ru: 'Пользователи и доступ', en: 'Users & Access' },
  'users.addUser': { ru: 'Добавить пользователя', en: 'Add User' },
  'users.role': { ru: 'Роль', en: 'Role' },
  'users.permissions': { ru: 'Разрешения', en: 'Permissions' },

  // Roles
  'role.agencyAdmin': { ru: 'Администратор агентства', en: 'Agency Admin' },
  'role.mediaBuyer': { ru: 'Медиабайер', en: 'Media Buyer' },
  'role.client': { ru: 'Клиент', en: 'Client' },

  // Language
  'lang.ru': { ru: 'Русский', en: 'Russian' },
  'lang.en': { ru: 'English', en: 'English' },
  'lang.switch': { ru: 'Язык', en: 'Language' },
} as const;

export type TranslationKey = keyof typeof translations;
