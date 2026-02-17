
# Полная система уведомлений: Email + Telegram + Web Push

## Обзор
Реализация трёхканальной системы уведомлений с настройками для каждого пользователя. Админы смогут рассылать уведомления команде и клиентам через любой канал.

## Что будет реализовано

### 1. Настройки уведомлений в профиле пользователя
Каждый пользователь сможет в своём профиле:
- Привязать Telegram (через бота)
- Включить/выключить Web Push
- Выбрать какие типы уведомлений получать по какому каналу (матрица: тип x канал)

### 2. Каналы доставки

**Email (Resend — уже подключён)**
- Мгновенные алерты: ошибки синхронизации, превышение бюджета
- Еженедельные дайджесты для команды (cron-задача)
- Месячные отчёты для клиентов (cron-задача)
- Событийные: новые задачи, комментарии, одобрения

**Telegram Bot**
- Мгновенные push-уведомления в личку
- Пользователь привязывает аккаунт через бота командой `/start <код>`
- Типы: алерты, задачи, сообщения в чате, изменения статусов

**Web Push (браузерные уведомления)**
- Всплывающие уведомления даже при закрытой вкладке
- Service Worker для фоновой обработки
- Пользователь разрешает через кнопку в профиле

### 3. Типы уведомлений

| Тип | Описание | Каналы |
|-----|----------|--------|
| Алерты | Ошибки синхронизации, нет лидов, превышение CPL | In-App + Email + Telegram |
| Задачи | Назначение, дедлайны, смена статуса | In-App + Telegram + Web Push |
| Чат | Новые сообщения в поддержке | In-App + Telegram |
| Отчёты | Еженедельный дайджест метрик | Email |
| Одобрения | Запросы на доступ, admin approvals | In-App + Email + Telegram |
| Клиентские | Месячные отчёты для клиентов | Email |

### 4. Админская панель рассылок
Страница для массовой рассылки: выбор получателей (команда / клиенты / все), канал, текст сообщения.

---

## Технический план

### Шаг 1: База данных
Новые таблицы и изменения:

```text
notification_preferences (настройки каналов для каждого пользователя)
  - user_id (FK)
  - email_enabled (boolean, default true)
  - telegram_enabled (boolean, default false)
  - telegram_chat_id (text, nullable)
  - telegram_link_code (text, nullable)
  - webpush_enabled (boolean, default false)
  - webpush_subscription (jsonb, nullable)
  - alert_channels (text[], default '{in_app,email}')
  - task_channels (text[], default '{in_app}')
  - chat_channels (text[], default '{in_app}')
  - report_channels (text[], default '{email}')

notification_broadcasts (история массовых рассылок)
  - id, created_by, channels, recipients_filter, subject, body, sent_at
```

RLS: пользователи видят и редактируют только свои настройки. Админы могут создавать broadcasts.

### Шаг 2: Telegram Bot Edge Function
Новая edge function `telegram-bot`:
- Обработка webhook от Telegram (`/start <code>` для привязки)
- Отправка сообщений через Telegram Bot API
- Потребуется секрет `TELEGRAM_BOT_TOKEN` (пользователь создаёт бота через @BotFather)

### Шаг 3: Web Push Edge Function
Новая edge function `send-webpush`:
- Отправка push-уведомлений через Web Push API
- Потребуется сгенерировать VAPID-ключи (секреты `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`)

### Шаг 4: Единый диспетчер уведомлений
Новая edge function `send-notification`:
- Принимает: user_id, type, title, message, link
- Проверяет настройки пользователя в `notification_preferences`
- Рассылает по нужным каналам: in-app (insert в notifications), email (Resend), telegram, web push
- Все существующие триггеры БД будут вызывать эту функцию вместо прямого INSERT

### Шаг 5: Cron-задачи для периодических отчётов
- Еженедельный дайджест (каждый понедельник): агрегация метрик за неделю, отправка email команде
- Месячный отчёт для клиентов: сводка по расходам и результатам

### Шаг 6: UI компоненты
- **ProfilePage** — новая секция "Notification Settings": переключатели каналов, привязка Telegram, разрешение Web Push
- **Service Worker** — `public/sw.js` для фоновых push-уведомлений
- **Админская рассылка** — новая страница или секция для массовых уведомлений
- **i18n** — переводы на все 6 языков

### Шаг 7: Обновление триггеров БД
Переписать существующие триггеры (`notify_admins_new_access_request`, `notify_admins_support_message`, `notify_admins_approval_request`) чтобы они вызывали единый диспетчер через `pg_net.http_post` к edge function `send-notification`.

---

## Что потребуется от вас

1. **Telegram Bot Token** — создать бота через [@BotFather](https://t.me/BotFather) в Telegram и получить токен
2. **VAPID Keys** — будут сгенерированы автоматически при первом запуске

## Порядок реализации
1. Таблицы БД + RLS
2. Edge function `send-notification` (диспетчер)
3. Telegram bot + привязка в профиле
4. Web Push + Service Worker
5. Email-дайджесты (cron)
6. Админская панель рассылок
7. Обновление триггеров БД
8. i18n переводы
