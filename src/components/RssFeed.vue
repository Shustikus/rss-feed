<script>
export default {
  data() {
    return {
      rssItems: []
    };
  },
  async created() {
    await this.fetchRssFeed();
    this.pollingInterval = setInterval(this.fetchRssFeed, 60000); // 1 минута
  },
  beforeDestroy() {
    clearInterval(this.pollingInterval);
  },
  methods: {
    async fetchRssFeed() {
      try {
        const response = await fetch('https://test.wannatrend.ru/rss');
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const channel = xmlDoc.querySelector('channel');
        if (!channel) throw new Error('Invalid RSS feed: missing channel');

        this.rssItems = Array.from(channel.querySelectorAll('item')).map(item => {
          const enclosure = item.querySelector('enclosure');
          const type = enclosure?.getAttribute('type');

          // Проверяем, что тип вложения не является видео
          if (!type || !type.startsWith('video/')) {
            return {
              title: item.querySelector('title')?.textContent || '',
              description: item.querySelector('description')?.textContent || '',
              Source: item.querySelector('Source')?.textContent || '',
              pubDate: item.querySelector('pubDate')?.textContent || '',
              link: item.querySelector('link')?.textContent || '',
              imageUrl: type && type.startsWith('image/') ? enclosure.getAttribute('url') : ''
            };
          } else {
            return null;
          }
        }).filter(item => item !== null);
      } catch (error) {
        console.error('Error fetching RSS feed:', error);
      }
    }
  }
};
</script>

<template>
  <div class="rss-feed">
    <h1>RSS Feed</h1>
    <ul v-if="rssItems.length > 0">
      <li v-for="(item, index) in rssItems" :key="index">
        <h2>{{ item.title }}</h2>
        <div v-if="item.imageUrl" class="image-container">
          <img :alt="item.title" :src="item.imageUrl"/>
        </div>
        <p>{{ item.description }}</p>
        <p>{{ item.Source }}</p>
        <p>{{ item.pubDate }}</p>
        <a :href="item.link" target="_blank">Читать дальше...</a>
      </li>
    </ul>
    <p v-else>No RSS items available</p>
  </div>
</template>

<style scoped>
.rss-feed ul {
  list-style-type: none;
  padding: 0;
}

.rss-feed li {
  margin-bottom: 2rem;
}

.image-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 1rem;
}

.rss-feed img {
  max-width: 100%;
  height: auto;
  display: block;
}

.rss-feed {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

ul {
  list-style-type: none;
  padding: 0;
}

li {
  margin-bottom: 20px;
  border-bottom: 1px solid #ccc;
  padding-bottom: 10px;
}

h1 {
  text-align: center;
}

h2 {
  margin-bottom: 5px;
}

a {
  margin-top: 5px;
  text-decoration: auto;
}

a:hover {
  text-decoration: underline;
}
</style>
