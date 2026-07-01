/**
 * 灵感库 4 大分类
 */
export const INSPIRATION_CATEGORIES = [
  {
    value: 'packaging',
    label: '包装结构',
    desc: '礼盒、纸袋、卡套、开窗、抽拉盒、内托、外箱及运输包装等参考内容，帮助快速了解不同包装形式的结构、开启方式、组合逻辑及展示效果。'
  },
  {
    value: 'peripheral',
    label: '周边品类灵感',
    desc: '亚克力立牌、透卡、徽章、色纸、金属、PVC、纸品、礼盒套组等周边成品参考，帮助了解不同品类的呈现形式、组合玩法及设计方向。'
  },
  {
    value: 'effect',
    label: '效果与特殊工艺',
    desc: '贝壳光、仿螺钿、反光、镭射、烫金、云母、幻彩、局部UV、立体烫金、压纹等视觉效果参考，帮助判断不同工艺能够呈现的质感及适用场景。'
  },
  {
    value: 'production',
    label: '印刷与生产攻略',
    desc: '纸张类型、印刷方式、覆膜、打样流程、工艺拆解、文件制作及生产避坑等内容，帮助了解周边从设计到制作落地的具体方式及注意事项。'
  }
]

export const INSPIRATION_CATEGORY_MAP = INSPIRATION_CATEGORIES.reduce((m, c) => {
  m[c.value] = c
  return m
}, {})

export function getCategoryLabel(value) {
  return INSPIRATION_CATEGORY_MAP[value]?.label || value || '-'
}
