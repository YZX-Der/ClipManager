import Vue from 'vue';
import App from './App.vue';

Vue.config.productionTip = false;
Vue.config.devtools = false;

/**
 * Vue 2 入口实例
 */
new Vue({
  render: (h) => h(App),
}).$mount('#app');
