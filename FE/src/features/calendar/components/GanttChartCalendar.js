import React, { useState, useRef, useEffect } from 'react';
import { View, ScrollView, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Svg, Rect, Line, Text as SvgText, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import Icon from 'react-native-vector-icons/FontAwesome';
import Popup from "../../todo/components/TaskPopup";

// --- CẤU HÌNH KÍCH THƯỚC & MÀU SẮC ---
const CONFIG = {
    cellWidth: 60,      // Tăng độ rộng cột để dễ nhìn
    headerHeight: 60,   // Tăng chiều cao header để chứa cả Thứ và Ngày
    rowHeight: 50,      // Chiều cao mỗi dòng task
    barHeight: 30,      // Chiều cao thanh task
    barRadius: 6,       // Bo góc thanh task
    colors: {
        gridBorder: '#E0E0E0',
        weekendBg: '#F9FAFB',
        todayBg: '#E8F5E9',
        todayText: '#2E7D32',
        textPrimary: '#333333',
        textSecondary: '#888888',
        projectColors: {
            "TODO": '#FFAB91',   // Cam nhạt
            "DOING": '#90CAF9',  // Xanh dương nhạt
            "DONE": '#A5D6A7',   // Xanh lá nhạt
            "ERROR": '#EF9A9A',  // Đỏ nhạt
        }
    }
};

const GanttChart = ({ tasks, currentMonth, setCurrentMonth }) => {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    // Tạo mảng ngày
    const dateArray = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        dateArray.push(new Date(d));
    }

    // Sắp xếp task
    tasks.sort((a, b) => new Date(a.timeStart) - new Date(b.timeStart));

    // Thuật toán sắp xếp dòng (như cũ)
    const rows = [];
    tasks.forEach((task) => {
        let placed = false;
        for (let i = 0; i < rows.length; i++) {
            const lastTask = rows[i][rows[i].length - 1];
            // Thêm một khoảng đệm nhỏ để các task không dính sát nhau
            if (new Date(task.timeStart) >= new Date(lastTask.timeEnd)) {
                rows[i].push(task);
                placed = true;
                break;
            }
        }
        if (!placed) rows.push([task]);
    });

    const chartHeight = Math.max(rows.length * CONFIG.rowHeight + 50, 300); // Minimum height
    const chartWidth = dateArray.length * CONFIG.cellWidth;

    // Tính toán vị trí bar
    const calculateBar = (task, rowIndex) => {
        const tStart = new Date(task.timeStart);
        const tEnd = new Date(task.timeEnd);
        
        // Tính toán vị trí chính xác (bao gồm cả giờ phút nếu cần, ở đây tính theo ngày)
        const diffStart = (tStart - startDate) / (1000 * 60 * 60 * 24);
        const diffDuration = (tEnd - tStart) / (1000 * 60 * 60 * 24);

        const barX = diffStart * CONFIG.cellWidth;
        // Đảm bảo độ rộng tối thiểu là 1 phần nhỏ của cell nếu task quá ngắn
        const barWidth = Math.max(diffDuration * CONFIG.cellWidth, 10); 
        const barY = rowIndex * CONFIG.rowHeight + (CONFIG.rowHeight - CONFIG.barHeight) / 2;

        return { barWidth, barX, barY };
    };

    const scrollViewRef = useRef(null);

    // Auto scroll tới ngày hiện tại
    useEffect(() => {
        const todayIndex = dateArray.findIndex(date => {
            const d = new Date(date);
            d.setHours(0,0,0,0);
            return d.getTime() === currentDate.getTime();
        });

        if (todayIndex !== -1 && scrollViewRef.current) {
            setTimeout(() => {
                scrollViewRef.current.scrollTo({
                    x: todayIndex * CONFIG.cellWidth - CONFIG.cellWidth, // Scroll để ngày hiện tại nằm bên trái một chút
                    animated: true,
                });
            }, 500);
        }
    }, [currentMonth]); // Thay đổi dependency để chạy khi đổi tháng

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

    // Helper: Lấy tên thứ (T2, T3...)
    const getDayName = (date) => {
        const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        return days[date.getDay()];
    };

    return (
        <View style={styles.container}>
            {/* --- HEADER ĐIỀU HƯỚNG THÁNG --- */}
            <View style={styles.headerControl}>
                <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}>
                    <Icon name="chevron-left" size={16} color="#555" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {currentMonth.toLocaleString('vi-VN', { month: 'long', year: 'numeric' }).toUpperCase()}
                </Text>
                <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}>
                    <Icon name="chevron-right" size={16} color="#555" />
                </TouchableOpacity>
            </View>

            {/* --- BODY BIỂU ĐỒ --- */}
            <ScrollView horizontal ref={scrollViewRef} style={styles.scrollView} showsHorizontalScrollIndicator={false}>
                <View>
                    {/* SVG Canvas chứa cả Header Ngày và Grid */}
                    <Svg height={chartHeight + CONFIG.headerHeight} width={chartWidth}>
                        
                        {/* 1. VẼ NỀN VÀ HEADER (Lớp dưới cùng) */}
                        {dateArray.map((date, index) => {
                            const isToday = date.getTime() === currentDate.getTime();
                            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                            const xPos = index * CONFIG.cellWidth;

                            return (
                                <G key={`grid-${index}`}>
                                    {/* Nền cột (Weekend hoặc Today) */}
                                    <Rect
                                        x={xPos}
                                        y={0}
                                        width={CONFIG.cellWidth}
                                        height={chartHeight + CONFIG.headerHeight}
                                        fill={isToday ? CONFIG.colors.todayBg : (isWeekend ? CONFIG.colors.weekendBg : 'white')}
                                    />
                                    
                                    {/* Đường kẻ dọc mờ phân chia ngày */}
                                    <Line
                                        x1={xPos} y1={CONFIG.headerHeight}
                                        x2={xPos} y2={chartHeight + CONFIG.headerHeight}
                                        stroke={CONFIG.colors.gridBorder}
                                        strokeDasharray="4 2" // Nét đứt nhẹ nhàng
                                        strokeWidth="1"
                                    />

                                    {/* Text: Thứ (T2, T3...) */}
                                    <SvgText
                                        x={xPos + CONFIG.cellWidth / 2}
                                        y={25}
                                        fill={isToday ? CONFIG.colors.todayText : CONFIG.colors.textSecondary}
                                        fontSize="12"
                                        fontWeight="bold"
                                        textAnchor="middle"
                                    >
                                        {getDayName(date)}
                                    </SvgText>

                                    {/* Text: Ngày (01, 02...) */}
                                    <SvgText
                                        x={xPos + CONFIG.cellWidth / 2}
                                        y={45}
                                        fill={isToday ? CONFIG.colors.todayText : CONFIG.colors.textPrimary}
                                        fontSize="14"
                                        fontWeight={isToday ? "bold" : "normal"}
                                        textAnchor="middle"
                                    >
                                        {date.getDate()}
                                    </SvgText>

                                    {/* Đường kẻ ngang ngăn cách Header và Body */}
                                    <Line 
                                        x1={0} y1={CONFIG.headerHeight} 
                                        x2={chartWidth} y2={CONFIG.headerHeight} 
                                        stroke="#ddd" 
                                        strokeWidth="1" 
                                    />
                                </G>
                            );
                        })}

                        {/* 2. VẼ CÁC THANH TASK (Lớp trên) */}
                        <G y={CONFIG.headerHeight}> 
                            {rows.map((row, rowIndex) => (
                                row.map((task, index) => {
                                    const { barWidth, barX, barY } = calculateBar(task, rowIndex);
                                    const color = CONFIG.colors.projectColors[task.taskStatus] || '#999';
                                    
                                    // Cắt ngắn text nếu thanh quá ngắn
                                    const textLimit = Math.floor(barWidth / 8); 
                                    const displayTitle = task.taskName.length > textLimit 
                                        ? task.taskName.substring(0, textLimit) + "..." 
                                        : task.taskName;

                                    return (
                                        <G key={`task-${rowIndex}-${index}`} onPress={() => togglePopup(task)}>
                                            {/* Thanh Task chính */}
                                            <Rect
                                                x={barX}
                                                y={barY}
                                                width={barWidth}
                                                height={CONFIG.barHeight}
                                                rx={CONFIG.barRadius}
                                                ry={CONFIG.barRadius}
                                                fill={color}
                                                // Hiệu ứng bóng nhẹ (giả lập bằng stroke)
                                                stroke="rgba(0,0,0,0.05)"
                                                strokeWidth="2"
                                            />
                                            
                                            {/* Tên Task */}
                                            <SvgText
                                                x={barX + 5} // Padding left
                                                y={barY + CONFIG.barHeight / 2 + 5} // Căn giữa theo chiều dọc
                                                fill="#FFF"
                                                fontSize="12"
                                                fontWeight="600"
                                                textAnchor="start"
                                            >
                                                {displayTitle}
                                            </SvgText>
                                        </G>
                                    );
                                })
                            ))}
                        </G>

                         {/* 3. ĐƯỜNG KẺ INDICATOR HÔM NAY (Nằm trên cùng) */}
                         {dateArray.map((date, index) => {
                             if (date.getTime() === currentDate.getTime()) {
                                 return (
                                     <Line
                                        key="today-line"
                                        x1={index * CONFIG.cellWidth} 
                                        y1={CONFIG.headerHeight}
                                        x2={index * CONFIG.cellWidth} 
                                        y2={chartHeight + CONFIG.headerHeight}
                                        stroke={CONFIG.colors.todayText}
                                        strokeWidth="2"
                                     />
                                 )
                             }
                             return null;
                         })}

                    </Svg>
                </View>
            </ScrollView>
            
            {/* Giữ nguyên Popup */}
            {popupVisible && <Popup task={selectedTask} onClose={() => setPopupVisible(false)} />}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    headerControl: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        elevation: 2, // Shadow cho Android
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginHorizontal: 20,
        width: 200,
        textAlign: 'center',
    },
    navBtn: {
        padding: 8,
        backgroundColor: '#f5f5f5',
        borderRadius: 20,
    },
    scrollView: {
        flex: 1,
    }
});

export default GanttChart;