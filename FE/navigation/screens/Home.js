import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, SafeAreaView, Dimensions, ActivityIndicator, StatusBar, RefreshControl } from 'react-native';
import { useIsFocused } from "@react-navigation/native";
import Icon from 'react-native-vector-icons/FontAwesome5'; 
import Config from "./config.json";
import { AuthContext } from "../context/AuthContext";
import CarouselCustom from "../components/CarouselCustom";

const { width } = Dimensions.get('window');
const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

export default function Home({ navigation }) {
    const { userData } = useContext(AuthContext);
    const today = new Date();
    
    // State dữ liệu
    const [tasks, setTasks] = useState([]); // Tổng task CỦA USER
    const [project, setProject] = useState([]); // Dự án User tham gia
    const [todaytask, setTodaytask] = useState([]); // Task hôm nay CỦA USER
    
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false); // Kéo xuống để refresh
    const isFocused = useIsFocused();

    const dataImg = [
        { image: require('./images/phonebee.png') },
        { image: require('./images/granttbee.png') },
        { image: require('./images/multiphonebee.png') },
    ];

    useEffect(() => {
        if (isFocused) {
            loadAllData();
        }
    }, [isFocused]);

    async function loadAllData() {
        if (!userData?.user_id) return;
        setLoading(true);
        try {
            await fetchFromApi();
        } catch (error) {
            console.error("Lỗi API Home:", error);
        } finally {
            setLoading(false);
        }
    }

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchFromApi();
        setRefreshing(false);
    };

    async function fetchFromApi() {
        // Gọi 3 API song song để lấy dữ liệu cá nhân
        const [resProject, resTask, resToday] = await Promise.all([
            fetch(`${Config.URLAPI}/getprjectbyuserId?userId=${userData.user_id}`),
            fetch(`${Config.URLAPI}/getalltaskbyuser?userId=${userData.user_id}`),
            fetch(`${Config.URLAPI}/findtaskbydate?user_id=${userData.user_id}&date=${formatDate(today)}`)
        ]);

        const dataProject = await resProject.json();
        const dataTask = await resTask.json();
        const dataToday = await resToday.json();

        // Cập nhật State (Nếu rỗng thì set mảng rỗng, KHÔNG dùng Mock Data)
        setProject(Array.isArray(dataProject) ? dataProject : []);
        setTasks(Array.isArray(dataTask) ? dataTask : []);
        setTodaytask(Array.isArray(dataToday) ? dataToday : []);
    }

    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    const gotoTaskDetail = (item) => {
        // Cần truyền projectId để bên Detail biết đường xử lý
        const pid = item.project ? item.project.projectId : null;
        if(item.task_id) navigation.navigate('TaskDetail', { task: item, projectId: pid });
    };

    if (loading && !refreshing) {
        return (
            <View style={{flex:1, justifyContent:'center', alignItems:'center', backgroundColor: '#f8f9fa'}}>
                <ActivityIndicator size="large" color="#ffab33" />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
            <SafeAreaView style={{ flex: 1 }}>
                <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
                <ScrollView 
                    showsVerticalScrollIndicator={false} 
                    contentContainerStyle={{ paddingBottom: 20 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ffab33']} />}
                >
                     
                    {/* --- HEADER --- */}
                    <View style={styles.headerContainer}>
                        <View>
                            <Text style={styles.greetingText}>Xin chào,</Text>
                            <Text style={styles.usernameText}>{userData?.username || "Thành viên"}</Text>
                        </View>
                        <Image
                            source={userData?.imagePath ? { uri: userData.imagePath } : { uri: DEFAULT_AVATAR }}
                            style={styles.avatar}
                        />
                    </View>

                    {/* --- STATS DASHBOARD --- */}
                    <View style={styles.statsContainer}>
                        {/* Thẻ Dự án */}
                        <View style={[styles.statCard, { backgroundColor: '#ffab33', flex: 1, marginRight: 10 }]}>
                            <View style={styles.iconCircle}>
                                <Icon name="project-diagram" size={20} color="#ffab33" />
                            </View>
                            <Text style={styles.statNumber}>{project.length}</Text>
                            <Text style={styles.statLabel}>Dự án tham gia</Text>
                        </View>

                        <View style={{ flex: 1, gap: 10 }}>
                            {/* Thẻ Tổng Task */}
                            <View style={[styles.statCardSmall, { backgroundColor: '#fff' }]}>
                                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <View style={[styles.iconCircleSmall, {backgroundColor: '#e8f8f5'}]}>
                                        <Icon name="tasks" size={14} color="#2ecc71" />
                                    </View>
                                    <View style={{marginLeft: 10}}>
                                        <Text style={styles.statNumberSmall}>{tasks.length}</Text>
                                        <Text style={styles.statLabelSmall}>Việc của tôi</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Thẻ Việc Hôm nay */}
                            <View style={[styles.statCardSmall, { backgroundColor: '#fff' }]}>
                                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <View style={[styles.iconCircleSmall, {backgroundColor: '#fef9e7'}]}>
                                        <Icon name="calendar-day" size={14} color="#f1c40f" />
                                    </View>
                                    <View style={{marginLeft: 10}}>
                                        <Text style={styles.statNumberSmall}>{todaytask.length}</Text>
                                        <Text style={styles.statLabelSmall}>Hạn hôm nay</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* --- TODAY TASKS LIST --- */}
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Công việc hôm nay</Text>
                            {todaytask.length > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{todaytask.length}</Text>
                                </View>
                            )}
                        </View>

                        {todaytask.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Icon name="coffee" size={40} color="#ddd" />
                                <Text style={styles.emptyText}>Hôm nay bạn không có task nào!</Text>
                            </View>
                        ) : (
                            todaytask.map((item, index) => (
                                <TouchableOpacity 
                                    key={item.task_id || index} 
                                    style={styles.taskItem} 
                                    onPress={() => gotoTaskDetail(item)}
                                >
                                    <View style={[styles.taskIndicator, { backgroundColor: item.taskStatus === 'DONE' ? '#2ecc71' : '#ffab33' }]} />
                                    <View style={{flex: 1}}>
                                        <Text style={styles.taskName} numberOfLines={1}>{item.taskName}</Text>
                                        <Text style={styles.projectName} numberOfLines={1}>
                                            {item.project ? item.project.projectName : "..."}
                                        </Text>
                                    </View>
                                    <Icon name="chevron-right" size={14} color="#ccc" />
                                </TouchableOpacity>
                            ))
                        )}
                    </View>

                    {/* --- CAROUSEL --- */}
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>Khám phá</Text>
                        <View style={styles.carouselWrapper}>
                            <CarouselCustom data={dataImg} />
                        </View>
                    </View>

                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: 40, 
        marginBottom: 20,
    },
    greetingText: { fontSize: 16, color: '#666' },
    usernameText: { fontSize: 24, fontWeight: 'bold', color: '#333' },
    avatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: '#ddd' },
     
    // Stats Styles
    statsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 25,
        height: 140, 
    },
    statCard: {
        borderRadius: 20,
        padding: 20,
        justifyContent: 'space-between',
        shadowColor: "#ffab33", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5,
    },
    statCardSmall: {
        flex: 1,
        borderRadius: 15,
        paddingHorizontal: 15,
        justifyContent: 'center',
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
    },
    iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
    iconCircleSmall: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    statNumber: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginTop: 10 },
    statLabel: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
    statNumberSmall: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    statLabelSmall: { fontSize: 12, color: '#888' },

    // Section Styles
    sectionContainer: { marginBottom: 25, paddingHorizontal: 20 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    badge: { backgroundColor: '#ffab33', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 8 },
    badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

    // Carousel
    carouselWrapper: { borderRadius: 15, overflow: 'hidden', backgroundColor: '#fff', elevation: 2, paddingVertical: 10 },

    // Task List
    taskItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 15, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
    taskIndicator: { width: 4, height: 30, borderRadius: 2, marginRight: 15 },
    taskName: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
    projectName: { fontSize: 12, color: '#888' },
    emptyState: { alignItems: 'center', padding: 30, backgroundColor: '#f9f9f9', borderRadius: 15 },
    emptyText: { color: '#999', marginTop: 10 },
});