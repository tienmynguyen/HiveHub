import * as React from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet, Dimensions, StatusBar, ActivityIndicator } from 'react-native';
import GanttChart from '../components/GanttChartCalendar';
import Config from "./config.json";
import { AuthContext } from "../context/AuthContext";
import { useContext, useEffect, useState } from "react";
import { useIsFocused } from "@react-navigation/native";

const { height } = Dimensions.get('window');

export default function Calendar({ navigation }) {
    const { userData } = useContext(AuthContext);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const isFocused = useIsFocused();
    const [currentMonth, setCurrentMonth] = useState(new Date());

    useEffect(() => {
        if (isFocused && userData?.user_id) {
            fetchData();
        }
    }, [isFocused, userData]);

    async function fetchData() {
        setLoading(true);
        try {
            // API này trả về List<Task> mà user_id tham gia
            const response = await fetch(`${Config.URLAPI}/getalltaskbyuser?userId=${userData.user_id}`);
            const data = await response.json();
            
            if (Array.isArray(data)) {
                setTasks(data);
            } else {
                setTasks([]);
            }
        } catch (error) {
            console.error("Lỗi lấy lịch:", error);
            setTasks([]); // Lỗi thì set rỗng, KHÔNG dùng Mock Data
        } finally {
            setLoading(false);
        }
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
            <SafeAreaView style={{ flex: 1 }}>
                <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Lịch làm việc của tôi</Text>
                </View>
                
                {loading ? (
                    <ActivityIndicator size="large" color="#ffab33" style={{marginTop: 50}} />
                ) : (
                    <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                        <View style={{ minHeight: height * 0.8 }}>
                            {tasks.length > 0 ? (
                                <GanttChart tasks={tasks} currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} />
                            ) : (
                                <View style={styles.emptyState}>
                                    <Text style={{ color: '#999', fontSize: 16 }}>Bạn chưa có công việc nào.</Text>
                                    <Text style={{ color: '#ccc', fontSize: 12, marginTop: 5 }}>Các task được giao sẽ hiện ở đây</Text>
                                </View>
                            )}
                        </View>
                    </ScrollView>
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: 20,
        paddingTop: 40,
        paddingBottom: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        marginBottom: 10
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333'
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 100
    }
});