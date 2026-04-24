import React, { useMemo, useState, useRef, useEffect } from 'react';
import { View, ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Svg, Rect, Line, Text as SvgText, G } from 'react-native-svg';
import Icon from 'react-native-vector-icons/FontAwesome';
import Popup from "../../todo/components/TaskPopup";

const CONFIG = {
    cellWidth: 46,
    headerHeight: 54,
    rowHeight: 38,
    barHeight: 18,
    barRadius: 6,
    colors: {
        gridBorder: '#e2e8f0',
        weekendBg: '#f8fafc',
        todayLine: '#16a34a',
        textPrimary: '#0f172a',
        textSecondary: '#64748b',
        projectColors: {
            TODO: '#f59e0b',
            DOING: '#0ea5e9',
            IN_PROGRESS: '#0ea5e9',
            DONE: '#16a34a',
            ERROR: '#ef4444',
            DEFAULT: '#94a3b8',
        }
    }
};

function parseDate(value) {
    const date = new Date(value || '');
    if (Number.isNaN(date.getTime())) return null;
    return date;
}

function getTaskStart(task) {
    return parseDate(task?.timeStart) || parseDate(task?.startDate) || parseDate(task?.createdAt) || new Date();
}

function getTaskEnd(task, fallbackStart) {
    return parseDate(task?.timeEnd) || parseDate(task?.deadline) || parseDate(task?.endDate) || fallbackStart;
}

const GanttChart = ({ tasks, currentMonth, setCurrentMonth }) => {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const startDate = useMemo(() => new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1), [currentMonth]);
    const endDate = useMemo(() => new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0), [currentMonth]);

    const dateArray = useMemo(() => {
        const arr = [];
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            arr.push(new Date(d));
        }
        return arr;
    }, [startDate, endDate]);

    const normalizedTasks = useMemo(() => {
        return (Array.isArray(tasks) ? tasks : [])
            .map((task) => {
                const start = getTaskStart(task);
                const end = getTaskEnd(task, start);
                return {
                    ...task,
                    _start: start,
                    _end: end < start ? start : end,
                };
            })
            .sort((a, b) => a._start - b._start);
    }, [tasks]);

    const rows = [];
    normalizedTasks.forEach((task) => {
        let placed = false;
        for (let i = 0; i < rows.length; i++) {
            const lastTask = rows[i][rows[i].length - 1];
            if (task._start >= lastTask._end) {
                rows[i].push(task);
                placed = true;
                break;
            }
        }
        if (!placed) rows.push([task]);
    });

    const chartHeight = Math.max(rows.length * CONFIG.rowHeight, 260);
    const chartWidth = dateArray.length * CONFIG.cellWidth;

    const calculateBar = (task, rowIndex) => {
        const tStart = task._start;
        const tEnd = task._end;
        const diffStart = (tStart - startDate) / (1000 * 60 * 60 * 24);
        const diffDuration = (tEnd - tStart) / (1000 * 60 * 60 * 24);

        const barX = diffStart * CONFIG.cellWidth;
        const barWidth = Math.max(diffDuration * CONFIG.cellWidth, 16);
        const barY = rowIndex * CONFIG.rowHeight + (CONFIG.rowHeight - CONFIG.barHeight) / 2;

        return { barWidth, barX, barY };
    };

    const scrollViewRef = useRef(null);

    useEffect(() => {
        const todayIndex = dateArray.findIndex((date) => {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            return d.getTime() === currentDate.getTime();
        });

        if (todayIndex !== -1 && scrollViewRef.current) {
            setTimeout(() => {
                scrollViewRef.current.scrollTo({
                    x: Math.max(todayIndex * CONFIG.cellWidth - 120, 0),
                    animated: true,
                });
            }, 300);
        }
    }, [currentMonth, dateArray]);

    const changeMonth = (direction) => {
        const newMonth = new Date(currentMonth);
        newMonth.setMonth(newMonth.getMonth() + direction);
        setCurrentMonth(newMonth);
    };

    const [popupVisible, setPopupVisible] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);

    const togglePopup = (task) => {
        setSelectedTask(task);
        setPopupVisible(true);
    };

    const getDayName = (date) => {
        const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        return days[date.getDay()];
    };

    const fitText = (text, width) => {
        const value = String(text || '');
        const maxChars = Math.max(3, Math.floor((width - 10) / 6));
        if (value.length <= maxChars) return value;
        if (maxChars <= 3) return '...';
        return `${value.slice(0, maxChars - 3)}...`;
    };

    const getStatusColor = (status) => {
        const key = String(status || '').toUpperCase();
        return CONFIG.colors.projectColors[key] || CONFIG.colors.projectColors.DEFAULT;
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerControl}>
                <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}>
                    <Icon name="chevron-left" size={14} color="#475569" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {currentMonth.toLocaleString('vi-VN', { month: 'long', year: 'numeric' }).toUpperCase()}
                </Text>
                <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}>
                    <Icon name="chevron-right" size={14} color="#475569" />
                </TouchableOpacity>
            </View>

            <View style={styles.legendRow}>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: CONFIG.colors.projectColors.TODO }]} /><Text style={styles.legendText}>Todo</Text></View>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: CONFIG.colors.projectColors.DOING }]} /><Text style={styles.legendText}>Doing</Text></View>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: CONFIG.colors.projectColors.DONE }]} /><Text style={styles.legendText}>Done</Text></View>
            </View>

            <ScrollView style={styles.verticalScroll} nestedScrollEnabled showsVerticalScrollIndicator>
                <ScrollView horizontal ref={scrollViewRef} style={styles.horizontalScroll} showsHorizontalScrollIndicator nestedScrollEnabled>
                    <View>
                        <Svg height={chartHeight + CONFIG.headerHeight} width={chartWidth}>
                            {dateArray.map((date, index) => {
                                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                const xPos = index * CONFIG.cellWidth;

                                return (
                                    <G key={`grid-${index}`}>
                                        <Rect
                                            x={xPos}
                                            y={0}
                                            width={CONFIG.cellWidth}
                                            height={chartHeight + CONFIG.headerHeight}
                                            fill={isWeekend ? CONFIG.colors.weekendBg : '#fff'}
                                        />
                                        <Line
                                            x1={xPos} y1={CONFIG.headerHeight}
                                            x2={xPos} y2={chartHeight + CONFIG.headerHeight}
                                            stroke={CONFIG.colors.gridBorder}
                                            strokeDasharray="3 2"
                                            strokeWidth="1"
                                        />
                                        <SvgText
                                            x={xPos + CONFIG.cellWidth / 2}
                                            y={18}
                                            fill={CONFIG.colors.textSecondary}
                                            fontSize="10"
                                            fontWeight="600"
                                            textAnchor="middle"
                                        >
                                            {getDayName(date)}
                                        </SvgText>
                                        <SvgText
                                            x={xPos + CONFIG.cellWidth / 2}
                                            y={35}
                                            fill={CONFIG.colors.textPrimary}
                                            fontSize="12"
                                            fontWeight="700"
                                            textAnchor="middle"
                                        >
                                            {date.getDate()}
                                        </SvgText>
                                    </G>
                                );
                            })}

                            <Line
                                x1={0}
                                y1={CONFIG.headerHeight}
                                x2={chartWidth}
                                y2={CONFIG.headerHeight}
                                stroke={CONFIG.colors.gridBorder}
                                strokeWidth="1"
                            />

                            <G y={CONFIG.headerHeight}>
                                {rows.map((row, rowIndex) => (
                                    <G key={`row-${rowIndex}`}>
                                        <Line
                                            x1={0}
                                            y1={(rowIndex + 1) * CONFIG.rowHeight}
                                            x2={chartWidth}
                                            y2={(rowIndex + 1) * CONFIG.rowHeight}
                                            stroke="#f1f5f9"
                                        />
                                        {row.map((task, index) => {
                                            const { barWidth, barX, barY } = calculateBar(task, rowIndex);
                                            const color = getStatusColor(task.taskStatus);
                                            const taskTitle = task.taskName || task.name || `Task ${task.task_id || ''}`;
                                            const displayTitle = fitText(taskTitle, barWidth);
                                            return (
                                                <G key={`task-${rowIndex}-${index}`} onPress={() => togglePopup(task)}>
                                                    <Rect
                                                        x={barX}
                                                        y={barY}
                                                        width={barWidth}
                                                        height={CONFIG.barHeight}
                                                        rx={CONFIG.barRadius}
                                                        ry={CONFIG.barRadius}
                                                        fill={color}
                                                    />
                                                    {barWidth > 24 ? (
                                                        <SvgText
                                                            x={barX + 6}
                                                            y={barY + CONFIG.barHeight / 2 + 3}
                                                            fill="#fff"
                                                            fontSize="10"
                                                            fontWeight="700"
                                                            textAnchor="start"
                                                        >
                                                            {displayTitle}
                                                        </SvgText>
                                                    ) : null}
                                                </G>
                                            );
                                        })}
                                    </G>
                                ))}
                            </G>

                            {dateArray.map((date, index) => (
                                date.getTime() === currentDate.getTime() ? (
                                    <Line
                                        key="today-line"
                                        x1={index * CONFIG.cellWidth}
                                        y1={CONFIG.headerHeight}
                                        x2={index * CONFIG.cellWidth}
                                        y2={chartHeight + CONFIG.headerHeight}
                                        stroke={CONFIG.colors.todayLine}
                                        strokeWidth="2"
                                    />
                                ) : null
                            ))}
                        </Svg>
                    </View>
                </ScrollView>
            </ScrollView>

            {popupVisible && <Popup task={selectedTask} onClose={() => setPopupVisible(false)} />}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        minHeight: 340,
        backgroundColor: '#fff',
    },
    headerControl: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    headerTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0f172a',
        marginHorizontal: 16,
        width: 180,
        textAlign: 'center',
    },
    navBtn: {
        paddingHorizontal: 10,
        paddingVertical: 7,
        backgroundColor: '#f1f5f9',
        borderRadius: 14,
    },
    legendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 8,
        gap: 12,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center' },
    legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
    legendText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
    verticalScroll: { maxHeight: 500 },
    horizontalScroll: { flex: 1 },
});

export default GanttChart;