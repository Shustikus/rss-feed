const RSSParser = require('rss-parser');
const xml = require('xml');
const express = require('express');
const cors = require('cors');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const https = require('https');

dayjs.extend(utc);
dayjs.extend(timezone);

const httpsAgent = new https.Agent({
    keepAlive: true,
    timeout: 10000,
    rejectUnauthorized: false
});

const fetchRSSData = async (url) => {
    const response = await fetch(url, {
        agent: httpsAgent,
        headers: {
            'User-Agent': 'RSSFetcher/1.0',
            'Accept': 'application/rss+xml, application/xml'
        }
    });

    if (!response.ok) {
        throw new Error(`Ошибка HTTP: ${response.status}`);
    }

    return await response.text();
};

const parseRSSData = async (data) => {
    const parser = new RSSParser();
    const feed = await parser.parseString(data);
    return {
        title: feed.title,
        items: feed.items
    };
};

const aggregateRSSFeeds = async (feeds) => {
    const allItems = [];

    for (const feed of feeds) {
        try {
            const data = await fetchRSSData(feed);
            const parsedData = await parseRSSData(data);
            parsedData.items.forEach(item => {
                item.sourceTitle = parsedData.title;
                allItems.push(item);
            });
        } catch (error) {
            console.error(`Не удалось обработать ленту ${feed}: ${error.message}`);
        }
    }

    allItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    return allItems;
};

const formatRSSFeed = (items) => {
    const timeZone = 'Europe/Moscow';
    const rssFeed = {
        rss: [
            {_attr: {version: '2.0'}},
            {
                channel: items.map(item => ({
                    item: [
                        {title: item.title},
                        {link: item.link},
                        {pubDate: dayjs(item.pubDate).tz(timeZone).format('MMM DD YYYY | HH:mm')},
                        {description: `${item.sourceTitle}`}
                    ]
                }))
            }
        ]
    };

    return xml(rssFeed, {declaration: true});
};

class RSSService {
    constructor(feeds) {
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
            console.log('RSS лента обновлена');
        } catch (error) {
            console.error('Ошибка обновления RSS ленты:', error);
        }
    }

    getCachedFeed() {
        return this.cachedFeed;
    }
}

const rssUrls = [
    'https://lenta.ru/rss/news',
    'https://tass.ru/rss/anews.xml?sections=NDczMA%3D%3D',
    'https://www.vedomosti.ru/rss/news.xml',
    'http://static.feed.rbc.ru/rbc/logical/footer/news.rss',
    'https://www.sports.ru/rss/main.xml'
];

const app = express();
const port = 3000;

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
