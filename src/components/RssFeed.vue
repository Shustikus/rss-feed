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
        const response = await fetch('https://backend-seven-umber-48.vercel.app/rss');
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const channel = xmlDoc.querySelector('channel');
        if (!channel) throw new Error('Invalid RSS feed: missing channel');

        this.rssItems = Array.from(channel.querySelectorAll('item')).map(item => ({
          title: item.querySelector('title')?.textContent || '',
          description: item.querySelector('description')?.textContent || '',
          pubDate: item.querySelector('pubDate')?.textContent || '',
          link: item.querySelector('link')?.textContent || ''
        }));
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
        <p>{{ item.description }}</p>
        <p>{{ item.pubDate }}</p>
        <a :href="item.link" target="_blank">Читать дальше...</a>
      </li>
    </ul>
    <p v-else>No RSS items available</p>
  </div>
</template>


<style scoped>
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
