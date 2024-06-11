import React, { useState, useRef, useEffect } from 'react';
import { View, ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Svg, Rect, Line, Text as SvgText } from 'react-native-svg';
import Icon from 'react-native-vector-icons/FontAwesome';
import Popup from "./TaskPopup";

const GanttChart = ({ tasks, currentMonth, setCurrentMonth }) => {
    const currentDate = new Date();
    const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    startDate.setDate(startDate.getDate());

    const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    endDate.setDate(endDate.getDate());

    const dateArray = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        dateArray.push(new Date(d));
    }

    tasks.sort((a, b) => new Date(a.timeStart) - new Date(b.timeStart));

    const rows = [];
    tasks.forEach((task) => {
        let placed = false;
        for (let i = 0; i < rows.length; i++) {
            const lastTask = rows[i][rows[i].length - 1];
            if (new Date(task.timeStart) >= new Date(lastTask.timeEnd)) {
                rows[i].push(task);
                placed = true;
                break;
            }
        }
        if (!placed) rows.push([task]);
    });

    const chartHeight = rows.length * 40 + 50;
    const chartWidth = dateArray.length * 40;

    const projectColors = {
        "TODO": 'red',
        "DOING": 'yellow',
        "DONE": 'green',
        "ERROR": 'black',

        // Add other project IDs and colors if needed
    };

    const calculateBar = (task, rowIndex) => {
        const { timeStart, timeEnd } = task;
        const barX = (new Date(timeStart) - startDate) / (1000 * 60 * 60 * 24);
        const barWidth = (new Date(timeEnd) - new Date(timeStart)) / (1000 * 60 * 60 * 24);
        const barY = rowIndex * 40 + 20;
        return { barWidth, barX, barY };
    };


    const scrollViewRef = useRef(null);

    useEffect(() => {
        const todayIndex = dateArray.findIndex(date => {
            const isoToday = new Date().toISOString().split('T')[0];
            return date.toISOString().split('T')[0] === isoToday;
        });

        if (todayIndex !== -1 && scrollViewRef.current) {
            scrollViewRef.current.scrollTo({
                x: todayIndex * 40-40*2,
                animated: true,
            });
        }
    }, [dateArray]);



    const changeMonth = (direction) => {
        const newMonth = new Date(currentMonth);
        newMonth.setMonth(newMonth.getMonth() + direction);
        setCurrentMonth(newMonth);
    };

    // State to control the visibility of the popup
    const [popupVisible, setPopupVisible] = useState(false);
    // State to store the selected task
    const [selectedTask, setSelectedTask] = useState(null);

    // Function to toggle the popup visibility and set the selected task
    const togglePopup = (task) => {
        setSelectedTask(task);
        setPopupVisible(!popupVisible);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => changeMonth(-1)}>
                    <Icon name="chevron-left" size={20} style={styles.navIcon} />
                </TouchableOpacity>
                <Text style={styles.headerText}>{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</Text>
                <TouchableOpacity onPress={() => changeMonth(1)}>
                    <Icon name="chevron-right" size={20} style={styles.navIcon} />
                </TouchableOpacity>
            </View>

            <ScrollView horizontal ref={scrollViewRef}>
                <View>
                    {/* Fixed header for dates */}
                    <View style={styles.fixedHeader}>
                        <Svg height={50} width={chartWidth}>
                            {dateArray.map((date, index) => {
                                const isToday = date.toISOString().split('T')[0] === currentDate.toISOString().split('T')[0];
                                return (
                                    <React.Fragment key={index}>
                                        <Rect
                                            x={index * 40}
                                            y={0}
                                            width={40}
                                            height={50}
                                            fill={isToday ? 'lightgreen' : '#f0f0f0'}
                                            stroke="#ccc"
                                            strokeWidth="1"
                                        />
                                        <SvgText
                                            x={index * 40 + 10}
                                            y="30"
                                            fill={isToday ? 'green' : 'black'}
                                            fontSize="16"
                                            style={styles.dateText}
                                        >
                                            {date.getDate()}
                                        </SvgText>
                                    </React.Fragment>
                                );
                            })}
                        </Svg>
                    </View>
                    <ScrollView style={styles.scrollView}>
                        <Svg height={chartHeight} width={chartWidth}>
                            {dateArray.map((date, index) => (
                                <Line
                                    key={index}
                                    x1={index * 40}
                                    y1="0"
                                    x2={index * 40}
                                    y2={chartHeight}
                                    stroke="#ccc"
                                    strokeWidth="1"
                                />
                            ))}

                            {rows.map((row, rowIndex) => (
                                row.map((task, index) => {
                                    const { barWidth, barX, barY } = calculateBar(task, rowIndex);
                                    return (
                                        <Rect
                                            onPress={() => togglePopup(task)}
                                            key={index}
                                            x={barX * 40}
                                            y={barY}
                                            width={barWidth * 40+32}
                                            height={30}
                                            rx="5"
                                            fill={projectColors[task.taskStatus] || 'grey'}
                                            stroke={new Date() >= new Date(task.timeStart) && new Date() <= new Date(task.timeEnd) ? 'red' : ''}
                                            strokeWidth="1"
                                        >
                                            <SvgText
                                                x={barX * 40 + 5 + index * 5}
                                                y={barY + 5}
                                                fill="black"
                                                fontSize="12"
                                            >
                                                {task.taskName}
                                            </SvgText>
                                        </Rect>
                                    );
                                })
                            ))}
                        </Svg>
                    </ScrollView>
                </View>
            </ScrollView>
            {popupVisible && <Popup task={selectedTask} onClose={() => setPopupVisible(false)} />}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingLeft: 30,
        paddingRight: 30,
        flexDirection: 'row',
        justifyContent: 'space-between',
        margin: 10,
    },
    headerText: {
        fontSize: 18,
    },
    navText: {
        fontSize: 18,
    },
    fixedHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 50,
        backgroundColor: 'white',
        zIndex: 1,
        flexDirection: 'row',
    },
    scrollView: {
        marginTop: 50,
    },
    dateText: {
        textAlign: 'center',
    },
});

export default GanttChart;
