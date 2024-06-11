// Calendar.js
import * as React from 'react';
import { SafeAreaView, ScrollView, Text, View } from 'react-native';
import Background from '../components/Background2';
import GanttChart from '../components/GanttChart'; // Đảm bảo đường dẫn chính xác đến file GanttChart

export default function Calendar({ navigation }) {
    // Ví dụ về dữ liệu các công việc
    const tasks = [
        { name: 'Task 1', start: '2024-06-10', end: '2024-06-15', projectid: 'abc1' },
        { name: 'Task 2', start: '2024-06-14', end: '2024-06-17', projectid: 'abc1' },
        { name: 'Task 3', start: '2024-06-16', end: '2024-06-17', projectid: 'ab2' },
        { name: 'Task 4', start: '2024-06-17', end: '2024-06-18', projectid: 'ab2' },
        { name: 'Task 5', start: '2024-06-15', end: '2024-06-19', projectid: 'abc1' },
        { name: 'Task 6', start: '2024-06-19', end: '2024-06-20', projectid: 'ab3' },
        { name: 'Task 7', start: '2024-06-17', end: '2024-06-19', projectid: 'abf' },
        { name: 'Task 1', start: '2024-06-10', end: '2024-06-15', projectid: 'abc1' },
        { name: 'Task 2', start: '2024-06-14', end: '2024-06-17', projectid: 'abc1' },
        { name: 'Task 3', start: '2024-06-16', end: '2024-06-17', projectid: 'ab2' },
        { name: 'Task 4', start: '2024-06-17', end: '2024-06-18', projectid: 'ab2' },
        { name: 'Task 5', start: '2024-06-15', end: '2024-06-19', projectid: 'abc1' },
        { name: 'Task 6', start: '2024-06-19', end: '2024-06-20', projectid: 'ab3' },
        { name: 'Task 7', start: '2024-06-28', end: '2024-07-19', projectid: 'abf' },

    ];

    const [currentMonth, setCurrentMonth] = React.useState(new Date());

    return (
        <Background>
            <SafeAreaView style={{marginTop:80}}>
                <ScrollView>
                    <View style={{height:500}}>
                        <GanttChart tasks={tasks} currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} />
                    </View>
                </ScrollView>
            </SafeAreaView>
        </Background>
    );
}
