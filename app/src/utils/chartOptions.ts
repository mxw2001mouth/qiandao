import type { EChartsOption } from 'echarts'

// 统一颜色方案
export const CHART_COLORS = ['#6366F1', '#22C55E', '#EAB308', '#EF4444']

// 通用 grid 配置
const defaultGrid = {
  left: 16,
  right: 16,
  top: 40,
  bottom: 8,
  containLabel: true,
}

// 折线图配置工厂
export function createLineOption(
  title: string,
  xData: string[],
  yData: number[],
  opts?: { smooth?: boolean; areaStyle?: boolean; yAxisUnit?: string }
): EChartsOption {
  const smooth = opts?.smooth ?? true
  const areaStyle = opts?.areaStyle ?? true
  return {
    title: {
      text: title,
      left: 0,
      textStyle: { fontSize: 14, fontWeight: 600, color: '#1E293B' },
    },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (v) => `${v}${opts?.yAxisUnit ?? ''}`,
    },
    grid: defaultGrid,
    xAxis: {
      type: 'category',
      data: xData,
      axisLabel: { fontSize: 11, color: '#94A3B8' },
      axisLine: { lineStyle: { color: '#E2E8F0' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        fontSize: 11,
        color: '#94A3B8',
        formatter: `{value}${opts?.yAxisUnit ?? ''}`,
      },
      splitLine: { lineStyle: { color: '#F1F5F9' } },
    },
    series: [
      {
        type: 'line',
        data: yData,
        smooth,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color: CHART_COLORS[0] },
        lineStyle: { width: 2, color: CHART_COLORS[0] },
        areaStyle: areaStyle
          ? {
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(99,102,241,0.25)' },
                  { offset: 1, color: 'rgba(99,102,241,0.02)' },
                ],
              },
            }
          : undefined,
      },
    ],
  }
}

// 柱状图配置工厂
export function createBarOption(
  title: string,
  xData: string[],
  yData: number[],
  opts?: { horizontal?: boolean; colorList?: string[]; yAxisUnit?: string }
): EChartsOption {
  const horizontal = opts?.horizontal ?? false
  const colors = opts?.colorList ?? CHART_COLORS

  const categoryAxis = {
    type: 'category' as const,
    data: xData,
    axisLabel: { fontSize: 11, color: '#94A3B8' },
    axisLine: { lineStyle: { color: '#E2E8F0' } },
    axisTick: { show: false },
  }
  const valueAxis = {
    type: 'value' as const,
    axisLabel: {
      fontSize: 11,
      color: '#94A3B8',
      formatter: `{value}${opts?.yAxisUnit ?? ''}`,
    },
    splitLine: { lineStyle: { color: '#F1F5F9' } },
  }

  return {
    title: {
      text: title,
      left: 0,
      textStyle: { fontSize: 14, fontWeight: 600, color: '#1E293B' },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (v) => `${v}${opts?.yAxisUnit ?? ''}`,
    },
    grid: defaultGrid,
    xAxis: horizontal ? valueAxis : categoryAxis,
    yAxis: horizontal ? categoryAxis : valueAxis,
    series: [
      {
        type: 'bar',
        data: yData.map((v, i) => ({
          value: v,
          itemStyle: { color: colors[i % colors.length], borderRadius: horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0] },
        })),
        barMaxWidth: 32,
      },
    ],
  }
}

// 饼图（donut）配置工厂
export function createPieOption(
  title: string,
  data: { name: string; value: number }[],
  opts?: { centerText?: string }
): EChartsOption {
  return {
    title: {
      text: title,
      left: 0,
      textStyle: { fontSize: 14, fontWeight: 600, color: '#1E293B' },
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}人 ({d}%)',
    },
    legend: {
      bottom: 0,
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 16,
      textStyle: { fontSize: 12, color: '#64748B' },
    },
    graphic: opts?.centerText
      ? {
          type: 'text',
          left: 'center',
          top: '42%',
          style: {
            text: opts.centerText,
            fontSize: 20,
            fontWeight: 700,
            fill: '#1E293B',
          } as Record<string, unknown>,
        }
      : undefined,
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        data: data.map((d, i) => ({
          ...d,
          itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
        })),
      },
    ],
  }
}
