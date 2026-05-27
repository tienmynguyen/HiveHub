import React, { useMemo, useState, useRef, useEffect } from 'react';
import { View, ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Svg, Rect, Line, Text as SvgText, G } from 'react-native-svg';
import Icon from 'react-native-vector-icons/FontAwesome';
import Popup from './TaskPopup';

const CONFIG = {
  cellWidth: 40,
  headerHeight: 52,
  rowHeight: 34,
  barHeight: 18,
  barRadius: 5,
  colors: {
    gridBorder: '#e5e7eb',
    weekendBg: '#fafafa',
    todayLine: '#16a34a',
    textPrimary: '#111827',
    textSecondary: '#6b7280',
    sprint: '#6d28d9',
    story: '#2563eb',
    subtaskTodo: '#f59e0b',
    subtaskProgress: '#0ea5e9',
    subtaskDone: '#16a34a',
    subtaskOther: '#94a3b8',
  },
};

function toDate(v) {
  const d = new Date(v || '');
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function dayOffset(a, b) {
  return Math.floor((startOfDay(a).getTime() - startOfDay(b).getTime()) / (1000 * 60 * 60 * 24));
}

function intersectsRange(start, end, rangeStart, rangeEnd) {
  const s = startOfDay(start).getTime();
  const e = endOfDay(end).getTime();
  const rs = startOfDay(rangeStart).getTime();
  const re = endOfDay(rangeEnd).getTime();
  return e >= rs && s <= re;
}

function getSubtaskColor(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'DONE' || s === 'COMPLETED' || s === 'APPROVED') return CONFIG.colors.subtaskDone;
  if (s === 'IN_PROGRESS' || s === 'DOING') return CONFIG.colors.subtaskProgress;
  if (s === 'TODO') return CONFIG.colors.subtaskTodo;
  return CONFIG.colors.subtaskOther;
}

const GanttChart = ({ tasks = [], stories = [], sprints = [], currentMonth, setCurrentMonth }) => {
  const scrollViewRef = useRef(null);
  const currentDate = startOfDay(new Date());
  const [popupVisible, setPopupVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const rangeStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const rangeEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

  const dateArray = useMemo(() => {
    const arr = [];
    for (let d = new Date(rangeStart); d <= rangeEnd; d.setDate(d.getDate() + 1)) arr.push(new Date(d));
    return arr;
  }, [rangeStart, rangeEnd]);

  const rows = useMemo(() => {
    const sprintSorted = [...sprints].sort((a, b) => {
      const aDate = toDate(a.timeStart)?.getTime() || 0;
      const bDate = toDate(b.timeStart)?.getTime() || 0;
      return aDate - bDate;
    });
    const allRows = [];
    sprintSorted.forEach((sprint) => {
      const sprintStart = toDate(sprint.timeStart) || rangeStart;
      const sprintEnd = toDate(sprint.timeEnd) || sprintStart;
      allRows.push({
        id: `sprint-${sprint.sprint_id}`,
        type: 'sprint',
        level: 0,
        title: sprint.sprintName || `Sprint ${sprint.sprint_id}`,
        start: sprintStart,
        end: sprintEnd,
      });
      const sprintStories = stories
        .filter((story) => Number(story.sprint_id) === Number(sprint.sprint_id))
        .sort((a, b) => Number(a.storyOrder || 0) - Number(b.storyOrder || 0));

      sprintStories.forEach((story) => {
        const storyTasks = tasks.filter((task) => Number(task.story_id) === Number(story.story_id));
        const taskStarts = storyTasks.map((x) => toDate(x.timeStart)).filter(Boolean);
        const taskEnds = storyTasks.map((x) => toDate(x.timeEnd || x.deadline)).filter(Boolean);
        const storyStart = taskStarts.length ? new Date(Math.min(...taskStarts.map((d) => d.getTime()))) : sprintStart;
        const storyEnd = taskEnds.length ? new Date(Math.max(...taskEnds.map((d) => d.getTime()))) : sprintEnd;
        allRows.push({
          id: `story-${story.story_id}`,
          type: 'story',
          level: 1,
          title: story.storyName || `Story ${story.story_id}`,
          start: storyStart,
          end: storyEnd,
          status: story.storyStatus,
          sprintId: sprint.sprint_id,
        });
        storyTasks
          .sort((a, b) => (toDate(a.timeStart)?.getTime() || 0) - (toDate(b.timeStart)?.getTime() || 0))
          .forEach((task) => {
            allRows.push({
              id: `task-${task.task_id}`,
              type: 'subtask',
              level: 2,
              title: task.taskName || `Subtask ${task.task_id}`,
              start: toDate(task.timeStart) || storyStart,
              end: toDate(task.timeEnd || task.deadline) || storyEnd,
              status: task.taskStatus,
              task,
              storyId: story.story_id,
            });
          });
      });
    });
    return allRows;
  }, [sprints, stories, tasks, rangeStart, rangeEnd]);

  const renderedRows = useMemo(
    () => rows.filter((row) => intersectsRange(row.start, row.end, rangeStart, rangeEnd)),
    [rows, rangeStart, rangeEnd],
  );
  const chartHeight = Math.max(renderedRows.length * CONFIG.rowHeight + CONFIG.headerHeight + 8, 220);
  const timelineWidth = dateArray.length * CONFIG.cellWidth;

  useEffect(() => {
    const todayIndex = dateArray.findIndex((d) => startOfDay(d).getTime() === currentDate.getTime());
    if (todayIndex !== -1 && scrollViewRef.current) {
      setTimeout(() => {
        if (!scrollViewRef.current || typeof scrollViewRef.current.scrollTo !== 'function') return;
        scrollViewRef.current.scrollTo({
          x: Math.max(todayIndex * CONFIG.cellWidth - 120, 0),
          animated: true,
        });
      }, 350);
    }
  }, [currentMonth, dateArray, currentDate]);

  function changeMonth(direction) {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + direction);
    setCurrentMonth(next);
  }

  function barMeta(row) {
    if (row.type === 'sprint') return { color: CONFIG.colors.sprint, label: 'Sprint' };
    if (row.type === 'story') return { color: CONFIG.colors.story, label: 'Story' };
    return { color: getSubtaskColor(row.status), label: 'Subtask' };
  }

  function fitTextOnBar(text, barWidth) {
    const raw = String(text || '');
    const maxChars = Math.max(3, Math.floor((barWidth - 10) / 6));
    if (raw.length <= maxChars) return raw;
    if (maxChars <= 3) return '...';
    return `${raw.slice(0, maxChars - 3)}...`;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerControl}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}>
          <Icon name="chevron-left" size={14} color="#4b5563" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {currentMonth.toLocaleString('vi-VN', { month: 'long', year: 'numeric' }).toUpperCase()}
        </Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}>
          <Icon name="chevron-right" size={14} color="#4b5563" />
        </TouchableOpacity>
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: CONFIG.colors.sprint }]} /><Text style={styles.legendText}>Sprint</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: CONFIG.colors.story }]} /><Text style={styles.legendText}>Story</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: CONFIG.colors.subtaskProgress }]} /><Text style={styles.legendText}>Subtask</Text></View>
      </View>

      <View style={styles.chartViewport}>
        <ScrollView
          horizontal
          ref={scrollViewRef}
          nestedScrollEnabled
          showsHorizontalScrollIndicator
          contentContainerStyle={styles.horizontalScrollContent}
        >
          <View>
            <Svg height={CONFIG.headerHeight} width={timelineWidth}>
              {dateArray.map((date, idx) => {
                const x = idx * CONFIG.cellWidth;
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                return (
                  <G key={`date-head-${idx}`}>
                    <Rect
                      x={x}
                      y={0}
                      width={CONFIG.cellWidth}
                      height={CONFIG.headerHeight}
                      fill={isWeekend ? CONFIG.colors.weekendBg : '#fff'}
                    />
                    <SvgText x={x + CONFIG.cellWidth / 2} y={16} fill={CONFIG.colors.textSecondary} fontSize="10" textAnchor="middle">
                      {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()]}
                    </SvgText>
                    <SvgText x={x + CONFIG.cellWidth / 2} y={32} fill={CONFIG.colors.textPrimary} fontSize="11" fontWeight="700" textAnchor="middle">
                      {date.getDate()}
                    </SvgText>
                  </G>
                );
              })}
              <Line x1={0} y1={CONFIG.headerHeight - 1} x2={timelineWidth} y2={CONFIG.headerHeight - 1} stroke={CONFIG.colors.gridBorder} />
            </Svg>

            <ScrollView
              style={styles.verticalScroll}
              nestedScrollEnabled
              showsVerticalScrollIndicator
              scrollEventThrottle={16}
            >
              <Svg height={chartHeight - CONFIG.headerHeight} width={timelineWidth}>
                {/* Row background bands for premium visual grouping */}
                {renderedRows.map((row, i) => {
                  const y = i * CONFIG.rowHeight;
                  let rowBg = '#ffffff';
                  if (row.type === 'sprint') rowBg = '#faf5ff';
                  else if (row.type === 'story') rowBg = '#f0f9ff';
                  else rowBg = '#ffffff';

                  return (
                    <Rect
                      key={`row-bg-${row.id}`}
                      x={0}
                      y={y}
                      width={timelineWidth}
                      height={CONFIG.rowHeight}
                      fill={rowBg}
                    />
                  );
                })}

                {/* Day grid with overlay weekend shading */}
                {dateArray.map((date, idx) => {
                  const x = idx * CONFIG.cellWidth;
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  return (
                    <G key={`date-body-${idx}`}>
                      {isWeekend ? (
                        <Rect
                          x={x}
                          y={0}
                          width={CONFIG.cellWidth}
                          height={chartHeight - CONFIG.headerHeight}
                          fill="rgba(15, 23, 42, 0.03)"
                        />
                      ) : null}
                      <Line x1={x} y1={0} x2={x} y2={chartHeight - CONFIG.headerHeight} stroke={CONFIG.colors.gridBorder} strokeDasharray="3 2" />
                    </G>
                  );
                })}

                {renderedRows.map((row, i) => {
                  const y = i * CONFIG.rowHeight;
                  const barY = y + (CONFIG.rowHeight - CONFIG.barHeight) / 2;
                  const startIdx = dayOffset(row.start, rangeStart);
                  const endIdx = dayOffset(row.end, rangeStart);
                  const barX = startIdx * CONFIG.cellWidth;
                  const barWidth = Math.max((endIdx - startIdx + 1) * CONFIG.cellWidth, 14);
                  const meta = barMeta(row);
                  const shownText = fitTextOnBar(row.title, barWidth);

                  // Nesting relationship connectors
                  let connector = null;
                  if (row.type === 'story' && row.sprintId) {
                    const parentRow = renderedRows.find(r => r.type === 'sprint' && r.id === `sprint-${row.sprintId}`);
                    if (parentRow) {
                      const parentIdx = renderedRows.indexOf(parentRow);
                      const parentY = parentIdx * CONFIG.rowHeight + CONFIG.rowHeight / 2;
                      const parentStartIdx = dayOffset(parentRow.start, rangeStart);
                      const parentX = parentStartIdx * CONFIG.cellWidth;
                      const currentY = y + CONFIG.rowHeight / 2;
                      
                      connector = (
                        <G key={`connect-${row.id}`}>
                          <Line
                            x1={parentX + 10}
                            y1={parentY}
                            x2={parentX + 10}
                            y2={currentY}
                            stroke="#c084fc"
                            strokeWidth="1.2"
                            strokeDasharray="2 2"
                          />
                          <Line
                            x1={parentX + 10}
                            y1={currentY}
                            x2={barX}
                            y2={currentY}
                            stroke="#c084fc"
                            strokeWidth="1.2"
                            strokeDasharray="2 2"
                          />
                        </G>
                      );
                    }
                  } else if (row.type === 'subtask' && row.storyId) {
                    const parentRow = renderedRows.find(r => r.type === 'story' && r.id === `story-${row.storyId}`);
                    if (parentRow) {
                      const parentIdx = renderedRows.indexOf(parentRow);
                      const parentY = parentIdx * CONFIG.rowHeight + CONFIG.rowHeight / 2;
                      const parentStartIdx = dayOffset(parentRow.start, rangeStart);
                      const parentX = parentStartIdx * CONFIG.cellWidth;
                      const currentY = y + CONFIG.rowHeight / 2;
                      
                      connector = (
                        <G key={`connect-${row.id}`}>
                          <Line
                            x1={parentX + 10}
                            y1={parentY}
                            x2={parentX + 10}
                            y2={currentY}
                            stroke="#93c5fd"
                            strokeWidth="1.2"
                            strokeDasharray="2 2"
                          />
                          <Line
                            x1={parentX + 10}
                            y1={currentY}
                            x2={barX}
                            y2={currentY}
                            stroke="#93c5fd"
                            strokeWidth="1.2"
                            strokeDasharray="2 2"
                          />
                        </G>
                      );
                    }
                  }

                  return (
                    <G key={`bar-group-${row.id}`}>
                      {connector}
                      <Line x1={0} y1={y + CONFIG.rowHeight} x2={timelineWidth} y2={y + CONFIG.rowHeight} stroke="#f1f5f9" />
                      <G onPress={row.task ? () => { setSelectedTask(row.task); setPopupVisible(true); } : undefined}>
                        <Rect
                          x={barX}
                          y={barY}
                          width={barWidth}
                          height={CONFIG.barHeight}
                          rx={CONFIG.barRadius}
                          ry={CONFIG.barRadius}
                          fill={meta.color}
                          opacity={row.type === 'subtask' ? 1 : 0.9}
                        />
                        {barWidth >= 60 ? (
                          <SvgText x={barX + 6} y={barY + 12} fill="#fff" fontSize="9" fontWeight="700">
                            {shownText}
                          </SvgText>
                        ) : (
                          <SvgText x={barX + barWidth + 6} y={barY + 12} fill="#475569" fontSize="9" fontWeight="700">
                            {row.title}
                          </SvgText>
                        )}
                      </G>
                    </G>
                  );
                })}

                {(() => {
                  const todayIndex = dayOffset(currentDate, rangeStart);
                  if (todayIndex < 0 || todayIndex >= dateArray.length) return null;
                  const x = todayIndex * CONFIG.cellWidth;
                  return <Line x1={x} y1={0} x2={x} y2={chartHeight - CONFIG.headerHeight} stroke={CONFIG.colors.todayLine} strokeWidth="2" />;
                })()}
              </Svg>
            </ScrollView>
          </View>
        </ScrollView>
      </View>

      {popupVisible ? <Popup task={selectedTask} onClose={() => setPopupVisible(false)} /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff' },
  headerControl: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginHorizontal: 14,
    minWidth: 180,
    textAlign: 'center',
  },
  navBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 14,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 8,
    gap: 12,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  chartViewport: {
    maxHeight: 520,
    minHeight: 280,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  verticalScroll: { maxHeight: 520 - CONFIG.headerHeight },
  horizontalScrollContent: { paddingBottom: 6 },
});

export default GanttChart;