# SEO и ресурсы

- Маршруты: `/`, `/diagnostika/`, `/strategiya/`, `/privacy/`, `/cookies/`, `/consent/`, `/terms/`, настоящая страница 404.
- В исходном HTML: отдельные title/description, один H1, canonical, Open Graph, Twitter card, русский язык, breadcrumbs, JSON-LD Organization/WebSite/WebPage/Service/BreadcrumbList без неподтверждённых контактов, рейтингов и отзывов.
- Метаданные, robots и sitemap создаёт `scripts/build.mjs`. `SITE_URL` — конечный HTTPS-домен. Включение `SITE_LIVE=1` разрешает индексацию главной, услуг и страницы cookie. Проекты юридических документов остаются noindex, пока не будут утверждены и переведены из draft.
- Демонстрационная версия имеет noindex и robots Disallow. Это намеренно: домен, оператор и приём заявок не подтверждены.
- Источники технической методики: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap и https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls .
- Для подготовки юридических разделов просмотрены материалы Роскомнадзора https://82.rkn.gov.ru/directions/pers/p15375/ . Проекты требуют заполнения под фактическую организацию и инфраструктуру.
- Manrope: локальные TTF, два начертания; лицензия OFL лежит в `dist/assets/fonts/OFL.txt`. Сайт не обращается к Google Fonts.
- Три фотографии и прозрачный логотип созданы встроенным image_gen по одобренному макету. WebP для фотографий, PNG для логотипа; размеры прописаны, hero загружается приоритетно, нижние фото — лениво.
- Исходные генерации сохранены отдельно в папке визуализаций с точными промптами; в сайт включены оптимизированные файлы.
- Логотип — генеративная очистка фотографии, не аттестованный векторный оригинал. Для строгой идентичности нужен исходник или утверждение векторизации.
