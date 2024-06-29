const axios = require('axios');
const RSSParser = require('rss-parser');
const xml = require('xml');
const express = require('express');
const cors = require('cors');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

class RSSFetcher {
    constructor(url) {
        this.url = url;
    }

    async fetch() {
        const response = await axios.get(this.url);
        return response.data;
    }
}

class RSSParserService {
    constructor(data) {
        this.data = data;
    }

    async parse() {
        const parser = new RSSParser();
        const feed = await parser.parseString(this.data);
        return {
            title: feed.title,
            items: feed.items
        };
    }
}

class RSSAggregator {
    constructor(feeds) {
        this.feeds = feeds;
    }

    async aggregate() {
        const allItems = [];
        for (const feed of this.feeds) {
            const rssFetcher = new RSSFetcher(feed);
            const data = await rssFetcher.fetch();
            const rssParserService = new RSSParserService(data);
            const parsedData = await rssParserService.parse();
            parsedData.items.forEach(item => {
                item.sourceTitle = parsedData.title;
                allItems.push(item);
            });
        }

        allItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
        return allItems;
    }
}

class RSSFormatter {
    constructor(items) {
        this.items = items;
    }

    format() {
        const timeZone = 'Europe/Moscow';
        const rssFeed = {
            rss: [
                {_attr: {version: '2.0'}},
                {
                    channel: [
                        ...this.items.map(item => ({
                            item: [
                                {title: item.title},
                                {link: item.link},
                                {pubDate: dayjs(item.pubDate).tz(timeZone).format('MMM DD YYYY | HH:mm')},
                                {description: `${item.sourceTitle}`}
                            ]
                        }))
                    ]
                }
            ]
        };

        return xml(rssFeed, {declaration: true});
    }
}

class RSSService {
    constructor(feeds) {
        this.feeds = feeds;
        this.cachedFeed = '';
        this.updateInterval = 60000;
        this.updateFeed();
        setInterval(this.updateFeed.bind(this), this.updateInterval);
    }

    async updateFeed() {
        try {
            const rssAggregator = new RSSAggregator(this.feeds);
            const aggregatedItems = await rssAggregator.aggregate();
            const rssFormatter = new RSSFormatter(aggregatedItems);
            this.cachedFeed = rssFormatter.format();
            console.log('RSS feed updated');
        } catch (error) {
            console.error('Error updating RSS feed:', error);
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
    console.log(`Server running at http://localhost:${port}/rss`);
});
