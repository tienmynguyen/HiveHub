import React, { useContext, useEffect, useMemo, useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput, Alert, Image, Modal, FlatList } from 'react-native';
import { Clipboard } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useIsFocused } from '@react-navigation/native';
import axios from 'axios';
import GanttChart from '../components/GanttChart';
import { endpoints } from '../../../config/endpoints';
import { AuthContext } from '../../auth/context/AuthContext';
import { getAvatarSource } from '../../../utils/avatar';

function formatDate(isoString) {
    if (!isoString) return '--/--';
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '--/--';
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function getStoryStatusUi(status) {
    const normalized = String(status || 'TODO').toUpperCase();
    switch (normalized) {
        case 'IN_PROGRESS':
            return { label: 'In Progress', bg: '#DEEBFF', color: '#0747A6' };
        case 'DONE':
            return { label: 'Done', bg: '#E3FCEF', color: '#006644' };
        case 'TODO':
        default:
            return { label: 'To Do', bg: '#DFE1E6', color: '#42526E' };
    }
}

function getSprintStatusUi(status) {
    const normalized = String(status || 'TODO').toUpperCase();
    switch (normalized) {
        case 'IN_PROGRESS':
            return { label: 'In Progress', bg: '#DEEBFF', color: '#0747A6' };
        case 'DONE':
            return { label: 'Done', bg: '#E3FCEF', color: '#006644' };
        case 'TODO':
        default:
            return { label: 'To Do', bg: '#DFE1E6', color: '#42526E' };
    }
}


export default function Plan({ navigation, route }) {
    const { projectId, projectName } = route.params || {};
    const { userData } = useContext(AuthContext);
    const isFocused = useIsFocused();

    const [tasks, setTasks] = useState([]);
    const [sprints, setSprints] = useState([]);
    const [stories, setStories] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [expandedSprints, setExpandedSprints] = useState({});
    const [newStoryBySprint, setNewStoryBySprint] = useState({});
    const [projectInfoVisible, setProjectInfoVisible] = useState(false);
    const [sprintModalVisible, setSprintModalVisible] = useState(false);
    const [editingSprintId, setEditingSprintId] = useState(null);
    const [sprintNameInput, setSprintNameInput] = useState('');
    const [sprintGoalInput, setSprintGoalInput] = useState('');
    const [sprintStartInput, setSprintStartInput] = useState('');
    const [sprintEndInput, setSprintEndInput] = useState('');
    const [sprintStatusInput, setSprintStatusInput] = useState('TODO');
    const [myRole, setMyRole] = useState('Member');
    const [notifications, setNotifications] = useState([]);
    const [notificationVisible, setNotificationVisible] = useState(false);
    const [addMemberVisible, setAddMemberVisible] = useState(false);
    const [memberEmailInput, setMemberEmailInput] = useState('');

    useEffect(() => {
        if (isFocused) loadData();
    }, [isFocused, projectId, userData?.user_id]);

    async function loadData() {
        if (!projectId || !userData?.user_id) return;
        setLoading(true);
        try {
            const [taskRes, sprintRes, storyRes, userRes, roleRes] = await Promise.all([
                axios.get(endpoints.projects.getTasks(projectId)),
                axios.get(endpoints.projects.getSprints(projectId)),
                axios.get(endpoints.projects.getStories(projectId)),
                axios.get(endpoints.projects.getUsers(projectId)),
                axios.get(endpoints.projects.getRole(projectId, userData?.user_id)),
            ]);
            setTasks(Array.isArray(taskRes.data) ? taskRes.data : []);
            setSprints(Array.isArray(sprintRes.data) ? sprintRes.data : []);
            setStories(Array.isArray(storyRes.data) ? storyRes.data : []);
            setMyRole(roleRes?.data?.role?.roleName || 'Member');
            const rawUsers = Array.isArray(userRes.data) ? userRes.data : [];
            const usersWithRoles = await Promise.all(
                rawUsers.map(async (u) => {
                    try {
                        const { data: roleRes } = await axios.get(endpoints.projects.getRole(projectId, u.user_id));
                        return { ...u, roleName: roleRes?.role?.roleName || 'Member' };
                    } catch (_err) {
                        return { ...u, roleName: 'Member' };
                    }
                }),
            );
            setUsers(usersWithRoles);
            if ((roleRes?.data?.role?.roleName || 'Member') === 'Owner' && userData?.user_id) {
                const { data: notiRes } = await axios.get(endpoints.notifications.getForOwner(projectId, userData.user_id));
                setNotifications(Array.isArray(notiRes) ? notiRes : []);
            } else {
                setNotifications([]);
            }
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể tải dữ liệu dự án.');
        } finally {
            setLoading(false);
        }
    }

    const storiesBySprint = useMemo(() => {
        const map = {};
        for (const sprint of sprints) {
            map[sprint.sprint_id] = stories
                .filter((s) => Number(s.sprint_id) === Number(sprint.sprint_id))
                .sort((a, b) => Number(a.storyOrder || 0) - Number(b.storyOrder || 0));
        }
        return map;
    }, [sprints, stories]);

    function toggleSprint(sprintId) {
        setExpandedSprints((prev) => ({ ...prev, [sprintId]: !prev[sprintId] }));
    }

    function getStoryAssignee(story) {
        const user = story?.assignee || users.find((u) => Number(u.user_id) === Number(story.assignee_user_id));
        return user || null;
    }

    async function createStory(sprintId) {
        if (myRole !== 'Owner') {
            Alert.alert('Không có quyền', 'Chỉ Owner mới có quyền chỉnh sửa.');
            return;
        }
        const name = (newStoryBySprint[sprintId] || '').trim();
        if (!name) return;
        try {
            await axios.post(endpoints.projects.createStory(projectId, sprintId, null), {
                storyName: name,
                storyStatus: 'TODO',
                ownerId: userData?.user_id,
            });
            setNewStoryBySprint((prev) => ({ ...prev, [sprintId]: '' }));
            loadData();
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể tạo story.');
        }
    }

    function toDateInput(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '';
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    function openCreateSprintModal() {
        setEditingSprintId(null);
        setSprintNameInput(`Sprint ${sprints.length + 1}`);
        setSprintGoalInput('');
        setSprintStartInput(toDateInput(new Date().toISOString()));
        setSprintEndInput(toDateInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()));
        setSprintStatusInput('TODO');
        setSprintModalVisible(true);
    }

    function openEditSprintModal(sprint) {
        setEditingSprintId(sprint.sprint_id);
        setSprintNameInput(sprint.sprintName || '');
        setSprintGoalInput(sprint.sprintGoal || '');
        setSprintStartInput(toDateInput(sprint.timeStart));
        setSprintEndInput(toDateInput(sprint.timeEnd));
        setSprintStatusInput(sprint.sprintStatus || 'TODO');
        setSprintModalVisible(true);
    }

    async function saveSprint() {
        if (myRole !== 'Owner') {
            Alert.alert('Không có quyền', 'Chỉ Owner mới có quyền chỉnh sửa.');
            return;
        }
        if (!sprintNameInput.trim()) {
            Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên sprint.');
            return;
        }
        try {
            const payload = {
                sprintName: sprintNameInput.trim(),
                sprintGoal: sprintGoalInput.trim(),
                sprintStatus: sprintStatusInput,
                timeStart: sprintStartInput ? new Date(`${sprintStartInput}T00:00:00`).toISOString() : new Date().toISOString(),
                timeEnd: sprintEndInput ? new Date(`${sprintEndInput}T23:59:59`).toISOString() : new Date().toISOString(),
            };
            if (editingSprintId) {
                await axios.post(endpoints.projects.updateSprint(editingSprintId, userData?.user_id), payload);
            } else {
                await axios.post(endpoints.projects.createSprint(projectId), {
                    ...payload,
                    ownerId: userData?.user_id,
                });
            }
            setSprintModalVisible(false);
            loadData();
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể lưu sprint.');
        }
    }

    async function deleteSprint(sprintId) {
        if (myRole !== 'Owner') {
            Alert.alert('Không có quyền', 'Chỉ Owner mới có quyền chỉnh sửa.');
            return;
        }
        try {
            await axios.delete(endpoints.projects.deleteSprint(sprintId, userData?.user_id));
            loadData();
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể xóa sprint.');
        }
    }

    async function markSprintDone(sprintId) {
        if (myRole !== 'Owner') {
            Alert.alert('Không có quyền', 'Chỉ Owner mới có quyền chỉnh sửa.');
            return;
        }
        try {
            await axios.post(endpoints.projects.updateSprint(sprintId, userData?.user_id), {
                sprintStatus: 'DONE',
            });
            loadData();
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể cập nhật trạng thái sprint.');
        }
    }

    async function createSprint() {
        if (myRole !== 'Owner') {
            Alert.alert('Không có quyền', 'Chỉ Owner mới có quyền chỉnh sửa.');
            return;
        }
        try {
            const sprintName = `Sprint ${sprints.length + 1}`;
            await axios.post(endpoints.projects.createSprint(projectId), {
                sprintName,
                sprintGoal: '',
                timeStart: new Date().toISOString(),
                timeEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                ownerId: userData?.user_id,
            });
            loadData();
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể tạo sprint mới.');
        }
    }

    function openStory(story) {
        navigation.navigate('StoryDetail', { story, projectId, projectName });
    }

    async function addMemberByEmail() {
        const email = memberEmailInput.trim();
        if (!email) {
            Alert.alert('Thiếu thông tin', 'Vui lòng nhập email thành viên.');
            return;
        }
        try {
            await axios.post(endpoints.projects.addMemberByEmail(projectId, userData?.user_id), { email });
            setMemberEmailInput('');
            setAddMemberVisible(false);
            loadData();
            Alert.alert('Thành công', 'Đã thêm thành viên vào dự án.');
        } catch (error) {
            const msg = error?.response?.data?.message || 'Không thể thêm thành viên.';
            Alert.alert('Lỗi', msg);
        }
    }

    async function markNotificationRead(item) {
        try {
            await axios.post(endpoints.notifications.markRead(item.notification_id, userData?.user_id), {});
            loadData();
        } catch (_error) {
            // ignore
        }
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
                    <Icon name="chevron-left" size={16} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{projectName || 'Project detail'}</Text>
                <View style={styles.headerRight}>
                    {myRole === 'Owner' ? (
                        <TouchableOpacity style={styles.iconBtn} onPress={() => setNotificationVisible(true)}>
                            <Icon name="bell" size={15} color="#333" />
                            {notifications.filter((n) => !n.read).length > 0 ? (
                                <View style={styles.notiBadge}>
                                    <Text style={styles.notiBadgeText}>{notifications.filter((n) => !n.read).length}</Text>
                                </View>
                            ) : null}
                        </TouchableOpacity>
                    ) : null}
                    {myRole === 'Owner' ? (
                        <TouchableOpacity style={styles.iconBtn} onPress={() => setAddMemberVisible(true)}>
                            <Icon name="user-plus" size={15} color="#333" />
                        </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity style={styles.iconBtn} onPress={() => setProjectInfoVisible(true)}>
                        <Icon name="info-circle" size={16} color="#333" />
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#ffab33" style={{ marginTop: 60 }} />
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.chartCard}>
                        <GanttChart
                            tasks={tasks}
                            stories={stories}
                            sprints={sprints}
                            currentMonth={currentMonth}
                            setCurrentMonth={setCurrentMonth}
                        />
                    </View>

                    <Text style={styles.sectionTitle}>Sprint ({sprints.length})</Text>
                    {sprints.map((sprint) => {
                        const isOpen = Boolean(expandedSprints[sprint.sprint_id]);
                        const sprintStories = storiesBySprint[sprint.sprint_id] || [];
                        const sprintStatusUi = getSprintStatusUi(sprint.sprintStatus);
                        const allStoriesDone =
                            sprintStories.length > 0 &&
                            sprintStories.every((story) => String(story.storyStatus || '').toUpperCase() === 'DONE');
                        const shouldSuggestDone =
                            myRole === 'Owner' &&
                            allStoriesDone &&
                            String(sprint.sprintStatus || '').toUpperCase() !== 'DONE';
                        return (
                            <View key={sprint.sprint_id} style={styles.sprintCard}>
                                <View style={styles.sprintHeader}>
                                    <TouchableOpacity style={{ flex: 1 }} onPress={() => toggleSprint(sprint.sprint_id)}>
                                        <Text style={styles.sprintName}>{sprint.sprintName}</Text>
                                        <View style={[styles.sprintStatusBadge, { backgroundColor: sprintStatusUi.bg }]}>
                                            <Text style={[styles.sprintStatusText, { color: sprintStatusUi.color }]}>{sprintStatusUi.label}</Text>
                                        </View>
                                        <Text style={styles.sprintDesc}>{sprint.sprintGoal || 'Không có mô tả'}</Text>
                                        <Text style={styles.sprintDate}>{formatDate(sprint.timeStart)} - {formatDate(sprint.timeEnd)}</Text>
                                    </TouchableOpacity>
                                    <View style={styles.sprintActionGroup}>
                                        {myRole === 'Owner' ? (
                                            <TouchableOpacity style={styles.sprintActionBtn} onPress={() => openEditSprintModal(sprint)}>
                                                <Icon name="edit" size={12} color="#3b82f6" />
                                            </TouchableOpacity>
                                        ) : null}
                                        {myRole === 'Owner' ? (
                                            <TouchableOpacity
                                                style={styles.sprintActionBtn}
                                                onPress={() =>
                                                    Alert.alert('Xác nhận', 'Xóa sprint này và toàn bộ story/subtask bên trong?', [
                                                        { text: 'Hủy', style: 'cancel' },
                                                        { text: 'Xóa', style: 'destructive', onPress: () => deleteSprint(sprint.sprint_id) },
                                                    ])
                                                }
                                            >
                                                <Icon name="trash" size={12} color="#ef4444" />
                                            </TouchableOpacity>
                                        ) : null}
                                        <TouchableOpacity style={styles.sprintActionBtn} onPress={() => toggleSprint(sprint.sprint_id)}>
                                            <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} color="#666" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {shouldSuggestDone ? (
                                    <View style={styles.sprintSuggestionBox}>
                                        <Text style={styles.sprintSuggestionText}>
                                            Tất cả story đã Done. Bạn có muốn chuyển sprint sang Done không?
                                        </Text>
                                        <TouchableOpacity style={styles.sprintSuggestionBtn} onPress={() => markSprintDone(sprint.sprint_id)}>
                                            <Text style={styles.sprintSuggestionBtnText}>Đánh dấu Sprint Done</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : null}

                                {isOpen ? (
                                    <View style={styles.sprintBody}>
                                        {sprintStories.map((story, idx) => {
                                            const assignee = getStoryAssignee(story);
                                            const statusUi = getStoryStatusUi(story.storyStatus);
                                            return (
                                                <TouchableOpacity key={story.story_id} style={styles.storyRow} onPress={() => openStory(story)}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.storyTitle}>{idx + 1}. {story.storyName}</Text>
                                                        <View style={[styles.storyStatusBadge, { backgroundColor: statusUi.bg }]}>
                                                            <Text style={[styles.storyStatus, { color: statusUi.color }]}>{statusUi.label}</Text>
                                                        </View>
                                                    </View>
                                                    <View style={styles.assigneeWrap}>
                                                        <Image
                                                            source={getAvatarSource(assignee)}
                                                            style={styles.avatar}
                                                        />
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        })}

                                        {myRole === 'Owner' ? (
                                            <View style={styles.createRow}>
                                                <TextInput
                                                    style={styles.createInput}
                                                    placeholder="Tên story mới..."
                                                    value={newStoryBySprint[sprint.sprint_id] || ''}
                                                    onChangeText={(text) => setNewStoryBySprint((prev) => ({ ...prev, [sprint.sprint_id]: text }))}
                                                />
                                                <TouchableOpacity style={styles.createBtn} onPress={() => createStory(sprint.sprint_id)}>
                                                    <Text style={styles.createBtnText}>Create</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ) : null}
                                    </View>
                                ) : null}
                            </View>
                        );
                    })}
                </ScrollView>
            )}

            {myRole === 'Owner' ? (
                <TouchableOpacity style={styles.fabCreate} onPress={openCreateSprintModal}>
                    <Icon name="plus" size={14} color="#fff" />
                    <Text style={styles.fabText}>Create</Text>
                </TouchableOpacity>
            ) : null}

            <Modal transparent visible={sprintModalVisible} animationType="fade" onRequestClose={() => setSprintModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>{editingSprintId ? 'Edit Sprint' : 'Create Sprint'}</Text>
                        <TextInput style={styles.modalInput} value={sprintNameInput} onChangeText={setSprintNameInput} placeholder="Tên sprint" />
                        <TextInput style={styles.modalInput} value={sprintGoalInput} onChangeText={setSprintGoalInput} placeholder="Mô tả sprint" />
                        <Text style={styles.modalLabel}>Trạng thái sprint</Text>
                        <View style={styles.statusPickerRow}>
                            {['TODO', 'IN_PROGRESS', 'DONE'].map((st) => {
                                const ui = getSprintStatusUi(st);
                                const active = sprintStatusInput === st;
                                return (
                                    <TouchableOpacity
                                        key={st}
                                        style={[
                                            styles.statusChip,
                                            { backgroundColor: ui.bg, borderColor: active ? ui.color : 'transparent', borderWidth: active ? 1.5 : 0 },
                                        ]}
                                        onPress={() => setSprintStatusInput(st)}
                                    >
                                        <Text style={[styles.statusChipText, { color: ui.color }]}>{ui.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <TextInput style={styles.modalInput} value={sprintStartInput} onChangeText={setSprintStartInput} placeholder="Ngày bắt đầu (YYYY-MM-DD)" />
                        <TextInput style={styles.modalInput} value={sprintEndInput} onChangeText={setSprintEndInput} placeholder="Ngày kết thúc (YYYY-MM-DD)" />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={() => setSprintModalVisible(false)}>
                                <Text style={styles.modalCancelText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, styles.modalSave]} onPress={saveSprint}>
                                <Text style={styles.modalSaveText}>Lưu</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal transparent visible={notificationVisible} animationType="fade" onRequestClose={() => setNotificationVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Thông báo cho Owner</Text>
                        <ScrollView style={{ maxHeight: 260 }}>
                            {notifications.length === 0 ? <Text style={styles.emptyText}>Chưa có thay đổi mới.</Text> : null}
                            {notifications.map((item) => (
                                <TouchableOpacity key={item.notification_id} style={styles.notiRow} onPress={() => markNotificationRead(item)}>
                                    <Text style={styles.notiMessage}>{item.message}</Text>
                                    <Text style={styles.notiTime}>{formatDate(item.createdAt)}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity style={[styles.modalBtn, styles.modalCancel, { alignSelf: 'flex-end', marginTop: 10 }]} onPress={() => setNotificationVisible(false)}>
                            <Text style={styles.modalCancelText}>Đóng</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal transparent visible={addMemberVisible} animationType="fade" onRequestClose={() => setAddMemberVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Thêm thành viên bằng email</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Nhập email thành viên..."
                            value={memberEmailInput}
                            onChangeText={setMemberEmailInput}
                            autoCapitalize="none"
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={() => setAddMemberVisible(false)}>
                                <Text style={styles.modalCancelText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, styles.modalSave]} onPress={addMemberByEmail}>
                                <Text style={styles.modalSaveText}>Thêm</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                transparent
                visible={projectInfoVisible}
                animationType="fade"
                onRequestClose={() => setProjectInfoVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={{ flex: 1, width: '100%' }} onPress={() => setProjectInfoVisible(false)} />
                    <View style={styles.infoDrawer}>
                        <View style={styles.infoHeader}>
                            <Text style={styles.infoTitle}>Project Info</Text>
                            <TouchableOpacity onPress={() => setProjectInfoVisible(false)}>
                                <Icon name="times" size={18} color="#555" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.projectCodeBox}>
                            <Text style={styles.projectCodeLabel}>ID dự án</Text>
                            <Text style={styles.projectCodeValue}>{projectId || '--'}</Text>
                            <TouchableOpacity
                                style={styles.copyProjectBtn}
                                onPress={() => {
                                    Clipboard.setString(projectId ? String(projectId) : '');
                                    Alert.alert('Đã sao chép', `ID: ${projectId}`);
                                }}
                            >
                                <Icon name="copy" size={12} color="#fff" />
                                <Text style={styles.copyProjectBtnText}>Copy ID</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.memberTitle}>Thành viên</Text>
                        <FlatList
                            data={users}
                            keyExtractor={(item) => String(item.user_id)}
                            renderItem={({ item }) => (
                                <View style={styles.memberRow}>
                                    <View style={styles.memberLeft}>
                                        <Image
                                            source={getAvatarSource(item)}
                                            style={styles.memberAvatar}
                                        />
                                        <View>
                                            <Text style={styles.memberName}>{item.username}</Text>
                                            <Text style={styles.memberEmail}>{item.email}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.roleBadge}>
                                        <Text style={styles.roleText}>{item.roleName || 'Member'}</Text>
                                    </View>
                                </View>
                            )}
                            ListEmptyComponent={<Text style={styles.emptyText}>Chưa có thành viên</Text>}
                        />
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f7f8fa' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 0, paddingBottom: 8 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
    notiBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#ef4444', borderRadius: 10, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
    notiBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#333', flex: 1, textAlign: 'center', marginHorizontal: 10 },
    scrollContent: { paddingHorizontal: 14, paddingBottom: 40 },
    chartCard: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 10 },
    sprintCard: { backgroundColor: '#fff', borderRadius: 14, marginBottom: 12, overflow: 'hidden' },
    sprintHeader: { flexDirection: 'row', alignItems: 'center', padding: 12 },
    sprintActionGroup: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
    sprintActionBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', marginLeft: 6 },
    sprintName: { fontSize: 15, fontWeight: '700', color: '#222' },
    sprintStatusBadge: { alignSelf: 'flex-start', marginTop: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
    sprintStatusText: { fontSize: 11, fontWeight: '700' },
    sprintSuggestionBox: {
        marginHorizontal: 12,
        marginBottom: 8,
        marginTop: 2,
        backgroundColor: '#fff7ed',
        borderWidth: 1,
        borderColor: '#fed7aa',
        borderRadius: 10,
        padding: 10,
    },
    sprintSuggestionText: { color: '#9a3412', fontSize: 12, marginBottom: 8 },
    sprintSuggestionBtn: {
        alignSelf: 'flex-start',
        backgroundColor: '#16a34a',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    sprintSuggestionBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    sprintDesc: { fontSize: 12, color: '#666', marginTop: 4 },
    sprintDate: { fontSize: 11, color: '#999', marginTop: 5 },
    sprintBody: { borderTopWidth: 1, borderTopColor: '#f0f2f4', padding: 12 },
    storyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#f6f7f8' },
    storyTitle: { fontSize: 14, color: '#2c3e50', fontWeight: '600' },
    storyStatusBadge: { alignSelf: 'flex-start', marginTop: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
    storyStatus: { fontSize: 11, fontWeight: '700' },
    assigneeWrap: { marginLeft: 8 },
    avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#eee' },
    createRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    createInput: { flex: 1, backgroundColor: '#f4f6f9', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginRight: 8 },
    createBtn: { backgroundColor: '#ffad44', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
    createBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
    fabCreate: {
        position: 'absolute',
        right: 18,
        bottom: 24,
        backgroundColor: '#ffad44',
        borderRadius: 24,
        paddingHorizontal: 14,
        height: 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5,
        gap: 6,
    },
    fabText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 16 },
    modalCard: { width: '100%', maxWidth: 380, backgroundColor: '#fff', borderRadius: 12, padding: 14 },
    modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 10, color: '#222' },
    modalLabel: { fontSize: 12, color: '#475467', fontWeight: '600', marginBottom: 6 },
    statusPickerRow: { flexDirection: 'row', marginBottom: 8 },
    statusChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, marginRight: 8 },
    statusChipText: { fontSize: 11, fontWeight: '700' },
    modalInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, marginBottom: 8, backgroundColor: '#f9fafb' },
    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
    modalBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginLeft: 8 },
    modalCancel: { backgroundColor: '#f3f4f6' },
    modalSave: { backgroundColor: '#ffad44' },
    modalCancelText: { color: '#555', fontWeight: '600' },
    modalSaveText: { color: '#fff', fontWeight: '700' },
    infoDrawer: {
        width: '90%',
        maxWidth: 420,
        maxHeight: '75%',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
    },
    infoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    infoTitle: { fontSize: 17, fontWeight: '700', color: '#222' },
    projectCodeBox: { backgroundColor: '#f6f8fb', borderRadius: 10, padding: 10, marginBottom: 12 },
    projectCodeLabel: { color: '#667085', fontSize: 12 },
    projectCodeValue: { color: '#1d2939', fontSize: 16, fontWeight: '700', marginTop: 4 },
    copyProjectBtn: {
        marginTop: 8,
        alignSelf: 'flex-start',
        backgroundColor: '#ffad44',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
    },
    copyProjectBtnText: { color: '#fff', fontSize: 11, fontWeight: '700', marginLeft: 6 },
    memberTitle: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 8 },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f2f4',
    },
    memberLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
    memberAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8, backgroundColor: '#eee' },
    memberName: { fontSize: 13, fontWeight: '600', color: '#222' },
    memberEmail: { fontSize: 11, color: '#667085' },
    roleBadge: { backgroundColor: '#eef2ff', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
    roleText: { color: '#3538cd', fontSize: 11, fontWeight: '700' },
    notiRow: { borderWidth: 1, borderColor: '#eef2f7', borderRadius: 10, padding: 10, marginBottom: 8, backgroundColor: '#fafcff' },
    notiMessage: { color: '#334155', fontSize: 12, fontWeight: '600' },
    notiTime: { color: '#94a3b8', fontSize: 11, marginTop: 4 },
});