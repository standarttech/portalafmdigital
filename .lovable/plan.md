

# Что уже сделано и что можно улучшить

## Уже реализовано
- Notification system: таблицы, preferences UI, Telegram bot, send-notification dispatcher, broadcasts page
- Meta OAuth integration (в AFM Internal / Social Media)
- Dashboard с KPI, графиками, drag-and-drop виджетами
- CRM с Kanban, лидами, аналитикой, webhooks
- AFM Internal: дашборд, медиабаинг, соцсети, финансы, планирование
- Клиентский портал, чат, задачи, отчёты, аудит, календарь
- MFA, force password change, invite flow
- i18n (6 языков), branding, модульная система доступа

## Что можно сделать дальше

### 1. Мобильная оптимизация всех страниц (приоритет)
Ты уже заметил что на телефоне громоздко. Сейчас отключены только анимации и убраны кнопки из хедера. Нужно пройти по каждой странице:
- **Dashboard**: KPI-карточки в 1 колонку, графики с горизонтальным скроллом
- **CRM Kanban**: горизонтальный скролл колонок вместо сжатия
- **Client Detail**: tabs в scroll-area, таблицы с фиксированными колонками
- **Reports/Audit/Users**: адаптивные таблицы, карточный вид на мобилке
- **AFM Internal**: все вложенные страницы (finance, media, sales)
- **Sidebar**: проверить ширину и закрытие на тач-устройствах

### 2. Web Push уведомления (из plan.md — не реализовано)
Service Worker `public/sw.js` существует, но Web Push подписка не работает:
- Генерация VAPID ключей
- Edge function `send-webpush` для отправки push через Web Push Protocol
- Кнопка "Разрешить уведомления" в профиле с реальной подпиской
- Отправка push при новых задачах/алертах

### 3. Cron-задачи для дайджестов (из plan.md — не реализовано)
- Еженедельный email-дайджест метрик для команды (понедельник утром)
- Месячный отчёт для клиентов (1-го числа)
- Настройка через `supabase/config.toml` cron schedules

### 4. Обновление триггеров БД на единый диспетчер (из plan.md — не реализовано)
Существующие триггеры (`notify_admins_new_access_request`, `notify_admins_support_message`) делают прямой INSERT в notifications. Нужно переписать на вызов edge function `send-notification` через `pg_net.http_post` для мультиканальной доставки.

### 5. Улучшение анимаций и производительности
- Заменить тяжёлые framer-motion stagger-анимации на CSS transitions
- Lazy load тяжёлых страниц (AFM, CRM, AdminScale)
- Виртуализация длинных списков (таблицы клиентов, лидов CRM)

### 6. Google/TikTok Ads интеграция
Meta подключена, но Google Ads и TikTok Ads упоминаются в описании проекта без реализации прямого API.

---

## Рекомендация
Начать с **мобильной оптимизации** — это влияет на всех пользователей прямо сейчас. Затем **Web Push** и **cron-дайджесты** для завершения системы уведомлений из plan.md.

