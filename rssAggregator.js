const express = require("express");
const Parser = require("rss-parser");
const xml = require('xml');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const cors = require('cors');
const fs = require('fs');

dayjs.extend(utc);
dayjs.extend(timezone);

const app = express();
const port = process.env.PORT || 3000;
const rssFilePath = 'aggregated_feed.xml';

// Список RSS каналов
const rssUrls = [
    'https://lenta.ru/rss/news',
    'https://tass.ru/rss/anews.xml?sections=NDczMA%3D%3D',
    'https://www.vedomosti.ru/rss/news.xml',
    'http://static.feed.rbc.ru/rbc/logical/footer/news.rss',
    'https://www.sports.ru/rss/main.xml'
];

// Функция для загрузки данных из RSS канала
const fetchRSSData = async (url) => {
    const parser = new Parser();
    try {
        const feed = await parser.parseURL(url);
        return {
            title: feed.title || 'Без названия', 
            items: feed.items || [] 
        };
    } catch (error) {
        throw new Error(`Не удалось загрузить или обработать RSS ленту ${url}: ${error.message}`);
    }
};

const aggregateRSSFeeds = async (feeds) => {
    const allItems = [];

    for (const feed of feeds) {
        try {
            const {items, title} = await fetchRSSData(feed);
            items.forEach(item => {
                item.sourceTitle = title;
                allItems.push(item);
            });
        } catch (error) {
            console.error(`Не удалось обработать ленту ${feed}: ${error.message}`);
        }
    }

    allItems.sort((a, b) => {
        const dateA = dayjs(a.pubDate);
        const dateB = dayjs(b.pubDate);
        if (dateA.isValid() && dateB.isValid()) {
            return dateB - dateA;
        } else {
            return 0;
        }
    });

    return allItems;
};

const formatRSSFeed = (items) => {
    const timeZone = 'Europe/Moscow';
    const rssFeed = {
        rss: [
            {_attr: {version: '2.0'}},
            {
                channel: [
                    ...items.map(item => {
                        const rssItem = [
                            {title: item.title || 'Без заголовка'},
                            {link: item.link || ''},
                            {pubDate: item.pubDate ? dayjs(item.pubDate).tz(timeZone).format('MMM DD YYYY | HH:mm') : ''},
                            {description: `${item.sourceTitle || 'Неизвестный источник'}`}
                        ];

                        if (item.enclosure && item.enclosure.url) {
                            rssItem.push({
                                enclosure: {
                                    _attr: {
                                        url: item.enclosure.url,
                                        type: item.enclosure.type || 'image/jpeg'
                                    }
                                }
                            });
                        } else if (item['media:content'] && item['media:content'].$ && item['media:content'].$.url) {
                            rssItem.push({
                                enclosure: {
                                    _attr: {
                                        url: item['media:content'].$.url,
                                        type: item['media:content'].$.type || 'image/jpeg'
                                    }
                                }
                            });
                        }

                        return {item: rssItem};
                    })
                ]
            }
        ]
    };

    return xml(rssFeed, {declaration: true});
};

// Функция для сохранения RSS ленты в файл
const saveRSSFeedToFile = (rssFeed) => {
    fs.writeFile(rssFilePath, rssFeed, (err) => {
        if (err) {
            console.error('Ошибка при сохранении RSS ленты в файл:', err);
        } else {
            console.log('RSS лента успешно сохранена в файл');
        }
    });
};

class RSSService {
    constructor(feeds) {
        if (!Array.isArray(feeds) || feeds.length === 0) {
            throw new Error('Не переданы корректные ленты RSS для RSSService');
        }

        this.feeds = feeds;
        this.cachedFeed = '';
        this.updateInterval = 60000;
        this.updateFeed();
        setInterval(() => this.updateFeed(), this.updateInterval);
    }

    async updateFeed() {
        try {
            const aggregatedItems = await aggregateRSSFeeds(this.feeds);
            this.cachedFeed = formatRSSFeed(aggregatedItems);
            saveRSSFeedToFile(this.cachedFeed); // Сохранение RSS ленты в файл
            console.log('RSS лента обновлена');
        } catch (error) {
            console.error('Ошибка обновления RSS ленты:', error);
        }
    }

    getCachedFeed() {
        return this.cachedFeed;
    }
}

const rssService = new RSSService(rssUrls);

app.use(cors({
    origin: 'https://shustikus.github.io',
    methods: ['GET'],
    allowedHeaders: ['Content-Type'] 
}));

app.get('/rss', (req, res) => {
    res.set('Content-Type', 'application/rss+xml');
    res.send(rssService.getCachedFeed());
});

app.listen(port, () => {
    console.log(`Сервер запущен по адресу http://localhost:${port}/rss`);
});
