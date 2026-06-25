<template>
  <div class="cal-wrap" v-show="show" @click.self="$emit('close')">
    <div class="cal-panel">
      <div class="cal-header">
        <button class="cal-nav" @click="prevMonth">‹</button>
        <span class="cal-title">{{ year }}年{{ month + 1 }}月</span>
        <button class="cal-nav" @click="nextMonth">›</button>
      </div>
      <div class="cal-weekdays">
        <span v-for="d in weekdays" :key="d">{{ d }}</span>
      </div>
      <div class="cal-days">
        <span
          v-for="(day, idx) in days"
          :key="idx"
          class="cal-day"
          :class="{ outside: day.outside, today: day.isToday, selected: day.isSelected, disabled: day.disabled }"
          @click="selectDay(day)"
        >{{ day.num }}</span>
      </div>
      <div class="cal-footer">
        <button class="cal-btn cal-today" @click="goToday">今天</button>
        <button class="cal-btn cal-clear" @click="clearDate">清除</button>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * macOS 风格日历选择器组件
 * 支持月份切换、今天定位、清除选择、日期范围限制
 */
export default {
  name: 'CalendarPicker',
  props: {
    show: { type: Boolean, default: false },
    value: { type: String, default: '' },
    minDate: { type: String, default: '' },
    maxDate: { type: String, default: '' },
  },
  data: function () {
    var now = new Date();
    var selDate = this.value ? this.parseDateStr(this.value) : null;
    return {
      year: selDate ? selDate.getFullYear() : now.getFullYear(),
      month: selDate ? selDate.getMonth() : now.getMonth(),
      weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    };
  },
  computed: {
    days: function () {
      var list = [];
      var self = this;
      var first = new Date(this.year, this.month, 1);
      var startDay = first.getDay();
      var daysInMonth = new Date(this.year, this.month + 1, 0).getDate();
      var today = new Date();
      var todayStr = this.dateToStr(today);
      var selStr = this.value || '';

      // 解析 min/max 为 YYYY-MM-DD 字符串用于比较
      var minStr = this.minDate || '';
      var maxStr = this.maxDate || '';

      // 上月补位
      var prevDays = new Date(this.year, this.month, 0).getDate();
      for (var i = startDay - 1; i >= 0; i--) {
        list.push({ num: prevDays - i, outside: true, isToday: false, isSelected: false, date: null, disabled: true });
      }

      // 本月
      for (var d = 1; d <= daysInMonth; d++) {
        var dt = new Date(this.year, this.month, d);
        var dStr = self.dateToStr(dt);
        var isToday = dStr === todayStr;
        var isSelected = dStr === selStr;
        var disabled = false;
        if (minStr && dStr < minStr) disabled = true;
        if (maxStr && dStr > maxStr) disabled = true;
        list.push({ num: d, outside: false, isToday: isToday, isSelected: isSelected, date: dt, disabled: disabled });
      }

      // 下月补位
      var remain = 42 - list.length;
      for (var j = 1; j <= remain; j++) {
        list.push({ num: j, outside: true, isToday: false, isSelected: false, date: null, disabled: true });
      }

      return list;
    },
  },
  methods: {
    /** 将 Date 对象转为 YYYY-MM-DD 字符串 */
    dateToStr: function (dt) {
      var y = dt.getFullYear();
      var m = String(dt.getMonth() + 1).padStart(2, '0');
      var d = String(dt.getDate()).padStart(2, '0');
      return y + '-' + m + '-' + d;
    },
    /** 将 YYYY-MM-DD 字符串解析为本地日期（避免时区偏移） */
    parseDateStr: function (str) {
      var parts = str.split('-');
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    },
    prevMonth: function () {
      if (this.month === 0) { this.month = 11; this.year--; }
      else { this.month--; }
    },
    nextMonth: function () {
      if (this.month === 11) { this.month = 0; this.year++; }
      else { this.month++; }
    },
    selectDay: function (day) {
      if (day.outside || !day.date || day.disabled) return;
      this.$emit('select', this.dateToStr(day.date));
    },
    goToday: function () {
      var now = new Date();
      this.year = now.getFullYear();
      this.month = now.getMonth();
      this.$emit('select', this.dateToStr(now));
    },
    clearDate: function () {
      this.$emit('select', '');
    },
  },
};
</script>

<style scoped>
.cal-wrap { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 200; }
.cal-panel { top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 280px; background: #fff; border-radius: 12px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04);
  padding: 14px; user-select: none;
}
.cal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.cal-title { font-size: 13px; font-weight: 600; color: #1d1d1f; }
.cal-nav {
  background: none; border: none; font-size: 18px; color: #007aff;
  cursor: pointer; width: 28px; height: 28px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
}
.cal-nav:hover { background: rgba(0,122,255,0.08); }
.cal-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; margin-bottom: 4px; }
.cal-weekdays span { font-size: 10px; color: #8e8e93; font-weight: 500; padding: 2px 0; }
.cal-days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; text-align: center; }
.cal-day {
  font-size: 12px; color: #1d1d1f; padding: 5px 0; border-radius: 50%;
  cursor: pointer; width: 32px; height: 32px; display: flex;
  align-items: center; justify-content: center; margin: 0 auto; transition: background 0.12s;
}
.cal-day:hover { background: #f5f5f7; }
.cal-day.outside { color: #c7c7cc; }
.cal-day.disabled { color: #d1d1d6; cursor: not-allowed; opacity: 0.35; }
.cal-day.disabled:hover { background: none; }
.cal-day.today { font-weight: 600; color: #007aff; }
.cal-day.selected { background: #007aff; color: #fff; font-weight: 500; }
.cal-day.selected:hover { background: #0066d6; }
.cal-footer { display: flex; justify-content: space-between; margin-top: 10px; padding-top: 8px; border-top: 1px solid #f0f0f0; }
.cal-btn { background: none; border: none; font-size: 12px; cursor: pointer; padding: 4px 10px; border-radius: 6px; font-weight: 500; }
.cal-today { color: #007aff; }
.cal-today:hover { background: rgba(0,122,255,0.08); }
.cal-clear { color: #8e8e93; }
.cal-clear:hover { background: rgba(0,0,0,0.04); }

[data-theme="dark"] .cal-panel { background: #2c2c2e; box-shadow: 0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06); }
[data-theme="dark"] .cal-title { color: #f2f2f7; }
[data-theme="dark"] .cal-nav { color: #0a84ff; }
[data-theme="dark"] .cal-nav:hover { background: rgba(10,132,255,0.12); }
[data-theme="dark"] .cal-weekdays span { color: #636366; }
[data-theme="dark"] .cal-day { color: #e5e5ea; }
[data-theme="dark"] .cal-day:hover { background: #3a3a3c; }
[data-theme="dark"] .cal-day.outside { color: #48484a; }
[data-theme="dark"] .cal-day.disabled { color: #3a3a3c; opacity: 0.3; }
[data-theme="dark"] .cal-day.disabled:hover { background: none; }
[data-theme="dark"] .cal-day.today { color: #0a84ff; }
[data-theme="dark"] .cal-day.selected { background: #0a84ff; color: #fff; }
[data-theme="dark"] .cal-footer { border-top-color: #3a3a3c; }
[data-theme="dark"] .cal-clear { color: #636366; }
[data-theme="dark"] .cal-clear:hover { background: rgba(255,255,255,0.06); }
</style>
