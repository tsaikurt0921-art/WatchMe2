import { 
  Sun, Moon, CloudSun, Cloud, CloudRain, Snowflake, CloudLightning 
} from 'lucide-react';
import React from 'react';

// --- 城市座標資料庫 (台灣主要縣市) ---
export const TAIWAN_CITIES = [
  { name: '臺北市', lat: 25.0330, lon: 121.5654 },
  { name: '新北市', lat: 25.0111, lon: 121.4657 },
  { name: '桃園市', lat: 24.9936, lon: 121.3009 },
  { name: '臺中市', lat: 24.1477, lon: 120.6736 },
  { name: '臺南市', lat: 22.9997, lon: 120.2270 },
  { name: '高雄市', lat: 22.6273, lon: 120.3014 },
  { name: '基隆市', lat: 24.7963, lon: 121.7371 },
  { name: '新竹市', lat: 24.8138, lon: 120.9675 },
  { name: '嘉義市', lat: 22.9947, lon: 120.4489 },
];

// --- 嚴格比例版型資料庫 ---
export const TEMPLATES = [
  // --- 橫式版型 (1920x1080) ---
  { id: 'L01', name: '全螢幕標準 (16:9)', type: 'landscape', category: '單一媒體', layout: 'L_FULL_16_9', zoneCount: 1, desc: '1個 16:9' },
  { id: 'L02', name: '四分割電視牆 (16:9)', type: 'landscape', category: '多媒體', layout: 'L_GRID_4', zoneCount: 4, desc: '4個 16:9' },
  { id: 'L03', name: '上下橫幅+雙影片', type: 'landscape', category: '零售', layout: 'L_BANNER_SANDWICH', zoneCount: 4, desc: '2個 Banner + 2個 16:9' },
  { id: 'L04', name: '主視覺+右側輪播', type: 'landscape', category: '企業', layout: 'L_MAIN_RIGHT_COL', zoneCount: 5, desc: '1個 4:3 + 4個 16:9' },
  { id: 'L05', name: '全橫幅廣告', type: 'landscape', category: '資訊', layout: 'L_ALL_BANNERS', zoneCount: 4, desc: '4個 Banner' },
  { id: 'L06', name: '頂部橫幅+複合主視', type: 'landscape', category: '複合', layout: 'L_TOP_BANNER_SPLIT', zoneCount: 5, desc: 'Banner + 4個 16:9' },
  { id: 'L07', name: '九宮格監控牆', type: 'landscape', category: '多媒體', layout: 'L_GRID_9', zoneCount: 9, desc: '9個 16:9' },
  { id: 'L08', name: '左側輪播+右側主視', type: 'landscape', category: '企業', layout: 'L_LEFT_COL_MAIN_RIGHT', zoneCount: 5, desc: '4個 16:9 + 1個 4:3' },
  { id: 'L09', name: '橫向三直式流媒體', type: 'landscape', category: '社群', layout: 'L_3_PORTRAIT', zoneCount: 3, desc: '3個 9:16' },
  { id: 'L10', name: '雙主圖+雙跑馬燈', type: 'landscape', category: '零售', layout: 'L_SPLIT_AND_BANNERS', zoneCount: 4, desc: '2個 16:9 + 2個 Banner' },

  // --- 直式版型 (1080x1920) ---
  { id: 'P01', name: '全螢幕直式 (9:16)', type: 'portrait', category: '單一媒體', layout: 'P_FULL_9_16', zoneCount: 1, desc: '1個 9:16 (滿版)' },
  { id: 'P02', name: '四分割監控 (9:16)', type: 'portrait', category: '多媒體', layout: 'P_GRID_4_9_16', zoneCount: 4, desc: '4個 9:16 (滿版)' },
  { id: 'P03', name: '直式三段廣告 (16:9)', type: 'portrait', category: '廣告', layout: 'P_STACK_3_16_9', zoneCount: 3, desc: '3個 16:9' },
  { id: 'P04', name: '雙主圖展示 (4:3)', type: 'portrait', category: '畫廊', layout: 'P_STACK_2_4_3', zoneCount: 2, desc: '2個 4:3' },
  { id: 'P05', name: '上影下雙圖 (複合)', type: 'portrait', category: '複合', layout: 'P_HYBRID_TOP_16_9_BOT_9_16', zoneCount: 3, desc: '1個 16:9 + 2個 9:16' },
  { id: 'P06', name: '上雙圖下影 (複合)', type: 'portrait', category: '複合', layout: 'P_HYBRID_TOP_9_16_BOT_16_9', zoneCount: 3, desc: '2個 9:16 + 1個 16:9' },
  { id: 'P07', name: '商品矩陣牆 (16:9)', type: 'portrait', category: '零售', layout: 'P_GRID_12_16_9', zoneCount: 12, desc: '12個 16:9 小區塊' },
  { id: 'P08', name: '資訊列表 (Banner)', type: 'portrait', category: '資訊', layout: 'P_BANNER_12', zoneCount: 12, desc: '12個 Banner 條列' },
  { id: 'P09', name: '主視覺+列表 (複合)', type: 'portrait', category: '導覽', layout: 'P_MAIN_4_3_BOT_BANNER', zoneCount: 5, desc: '1個 4:3 + 4個 Banner' },
  { id: 'P10', name: '菜單推薦 (16:9)', type: 'portrait', category: '餐飲', layout: 'P_MENU_5_ZONE', zoneCount: 5, desc: '1個大 16:9 + 4個小 16:9' },
];

export const DEFAULT_TEXT_BG = "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop";
