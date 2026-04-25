import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    SafeAreaView,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TextInput,
    Alert,
    Image,
    Modal,
    Animated,
    Dimensions,
    Platform,
} from 'react-native';
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

const SCREEN_HEIGHT = Dimensions.get('window').height;

function mapRoleLabel(roleName) {
    if (!roleName) return 'Member';
    if (String(roleName) === 'Leader') return 'Management';
    return String(roleName);
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
    const [projectDetail, setProjectDetail] = useState(null);
    const [deleteProjectConfirmInput, setDeleteProjectConfirmInput] = useState('');
    const slideY = useRef(new Animated.Value(-SCREEN_HEIGHT)).current;
    const [planViewTab, setPlanViewTab] = useState('sprints');
    const [epics, setEpics] = useState([]);
    const [newStoryByEpic, setNewStoryByEpic] = useState({});
    const [newStoryBacklog, setNewStoryBacklog] = useState('');
    const [epicModalVisible, setEpicModalVisible] = useState(false);
    const [newEpicName, setNewEpicName] = useState('');
    const [newEpicDesc, setNewEpicDesc] = useState('');
    const [expandedEpics, setExpandedEpics] = useState({ __backlog__: true });

    const canEditProject = useMemo(
        () => myRole === 'Owner' || myRole === 'Management' || myRole === 'Leader',
        [myRole],
    );

    const projectCompletion = useMemo(() => {
        const doneStories = stories.filter((s) => String(s.storyStatus || '').toUpperCase() === 'DONE').length;
        const doneTasks = tasks.filter((t) => {
            const st = String(t.taskStatus || '').toUpperCase();
            return st === 'DONE' || st === 'COMPLETED' || st === 'APPROVED';
        }).length;
        if (stories.length > 0) {
            return {
                percent: Math.round((doneStories / stories.length) * 100),
                label: `${doneStories}/${stories.length} story hoàn thành`,
            };
        }
        if (tasks.length > 0) {
            return {
                percent: Math.round((doneTasks / tasks.length) * 100),
                label: `${doneTasks}/${tasks.length} subtask hoàn thành`,
            };
        }
        return { percent: 0, label: 'Chưa có story/subtask' };
    }, [stories, tasks]);

    const backlogStories = useMemo(
        () =>
            stories.filter(
                (s) => s.epic_id == null || s.epic_id === undefined || String(s.epic_id) === '' || Number(s.epic_id) === 0,
            ),
        [stories],
    );

    const storiesByEpicId = useMemo(() => {
        const map = {};
        for (const epic of epics) {
            map[epic.epic_id] = stories
                .filter((s) => Number(s.epic_id) === Number(epic.epic_id))
                .sort((a, b) => Number(a.storyOrder || 0) - Number(b.storyOrder || 0));
        }
        return map;
    }, [epics, stories]);

    useEffect(() => {
        if (isFocused) loadData();
    }, [isFocused, projectId, userData?.user_id]);

    useEffect(() => {
        if (!projectInfoVisible) return;
        slideY.setValue(-SCREEN_HEIGHT);
        Animated.spring(slideY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 70,
            friction: 12,
        }).start();
    }, [projectInfoVisible, slideY]);

    async function loadData() {
        if (!projectId || !userData?.user_id) return;
        setLoading(true);
        try {
            const [taskRes, sprintRes, storyRes, epicRes, userRes, roleRes, projectRes] = await Promise.all([
                axios.get(endpoints.projects.getTasks(projectId)),
                axios.get(endpoints.projects.getSprints(projectId)),
                axios.get(endpoints.projects.getStories(projectId)),
                axios.get(endpoints.projects.getEpics(projectId)),
                axios.get(endpoints.projects.getUsers(projectId)),
                axios.get(endpoints.projects.getRole(projectId, userData?.user_id)),
                axios.get(endpoints.projects.getById(projectId, userData?.user_id)),
            ]);
            setTasks(Array.isArray(taskRes.data) ? taskRes.data : []);
            setSprints(Array.isArray(sprintRes.data) ? sprintRes.data : []);
            setStories(Array.isArray(storyRes.data) ? storyRes.data : []);
            setEpics(Array.isArray(epicRes.data) ? epicRes.data : []);
            setMyRole(roleRes?.data?.role?.roleName || 'Member');
            setProjectDetail(projectRes?.data || null);
            const rawUsers = Array.isArray(userRes.data) ? userRes.data : [];
            const usersWithRoles = await Promise.all(
                rawUsers.map(async (u) => {
                    try {
                        const { data: r } = await axios.get(endpoints.projects.getRole(projectId, u.user_id));
                        return { ...u, roleName: r?.role?.roleName || 'Member' };
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
        if (!canEditProject) {
            Alert.alert('Không có quyền', 'Chỉ Owner hoặc Management mới có quyền chỉnh sửa.');
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

    function toggleEpicBucket(key) {
        setExpandedEpics((prev) => ({ ...prev, [key]: !prev[key] }));
    }

    function openEpicModal() {
        setNewEpicName(`Epic ${epics.length + 1}`);
        setNewEpicDesc('');
        setEpicModalVisible(true);
    }

    async function saveEpic() {
        if (!canEditProject) return;
        const name = newEpicName.trim();
        if (!name) {
            Alert.alert('Thiếu thông tin', 'Nhập tên epic.');
            return;
        }
        try {
            await axios.post(endpoints.projects.createEpic(projectId), {
                epicName: name,
                description: newEpicDesc.trim(),
            });
            setEpicModalVisible(false);
            loadData();
        } catch (_err) {
            Alert.alert('Lỗi', 'Không thể tạo epic.');
        }
    }

    async function createStoryInEpicView(epicId) {
        if (!canEditProject) {
            Alert.alert('Không có quyền', 'Chỉ Owner hoặc Management mới có quyền chỉnh sửa.');
            return;
        }
        const name = epicId == null ? newStoryBacklog.trim() : String(newStoryByEpic[epicId] || '').trim();
        if (!name) return;
        try {
            await axios.post(endpoints.projects.createStory(projectId, null, epicId), {
                storyName: name,
                storyStatus: 'TODO',
                ownerId: userData?.user_id,
            });
            if (epicId == null) setNewStoryBacklog('');
            else setNewStoryByEpic((prev) => ({ ...prev, [epicId]: '' }));
            loadData();
        } catch (_err) {
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
        if (!canEditProject) {
            Alert.alert('Không có quyền', 'Chỉ Owner hoặc Management mới có quyền chỉnh sửa.');
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
        if (!canEditProject) {
            Alert.alert('Không có quyền', 'Chỉ Owner hoặc Management mới có quyền chỉnh sửa.');
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
        if (!canEditProject) {
            Alert.alert('Không có quyền', 'Chỉ Owner hoặc Management mới có quyền chỉnh sửa.');
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
        if (!canEditProject) {
            Alert.alert('Không có quyền', 'Chỉ Owner hoặc Management mới có quyền chỉnh sửa.');
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
        if (!canEditProject) {
            Alert.alert('Không có quyền', 'Chỉ Owner hoặc Management mới thêm thành viên.');
            return;
        }
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

    function closeProjectInfo() {
        Animated.timing(slideY, {
            toValue: -SCREEN_HEIGHT,
            duration: 240,
            useNativeDriver: true,
        }).start(() => {
            setProjectInfoVisible(false);
            setDeleteProjectConfirmInput('');
        });
    }

    async function removeProjectMember(targetUserId) {
        if (myRole !== 'Owner' || !userData?.user_id) return;
        try {
            await axios.post(endpoints.projects.removeMember(projectId, targetUserId, userData.user_id), {});
            await loadData();
            Alert.alert('Đã xóa', 'Đã gỡ thành viên khỏi dự án.');
        } catch (error) {
            Alert.alert('Lỗi', error?.response?.data?.message || 'Không thể xóa thành viên.');
        }
    }

    async function setMemberRole(targetUserId, roleId) {
        if (myRole !== 'Owner' || !userData?.user_id) return;
        try {
            await axios.post(endpoints.projects.updateUserRole(projectId, targetUserId, roleId, userData.user_id), {});
            await loadData();
            Alert.alert('Thành công', 'Đã cập nhật vai trò thành viên.');
        } catch (error) {
            Alert.alert('Lỗi', error?.response?.data?.message || 'Không thể cập nhật vai trò.');
        }
    }

    async function submitDeleteProject() {
        if (myRole !== 'Owner' || !userData?.user_id) return;
        if (String(deleteProjectConfirmInput).trim() !== String(projectId)) {
            Alert.alert('Chưa khớp', 'Nhập đúng mã ID dự án để xác nhận xóa.');
            return;
        }
        try {
            await axios.post(endpoints.projects.deleteProject(projectId, userData.user_id), {
                confirmProjectId: String(deleteProjectConfirmInput).trim(),
            });
            Alert.alert('Đã xóa', 'Dự án đã được xóa.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
        } catch (error) {
            Alert.alert('Lỗi', error?.response?.data?.message || 'Không thể xóa dự án.');
        }
    }

    const isCreator = projectDetail && Number(projectDetail.projectowner) === Number(userData?.user_id);

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
                    {canEditProject ? (
                        <TouchableOpacity style={styles.iconBtn} onPress={() => setAddMemberVisible(true)}>
                            <Icon name="user-plus" size={15} color="#333" />
                        </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => {
                            setDeleteProjectConfirmInput('');
                            setProjectInfoVisible(true);
                        }}
                    >
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

                    <View style={styles.planTabBar}>
                        <TouchableOpacity
                            style={[styles.planTab, planViewTab === 'sprints' && styles.planTabActive]}
                            onPress={() => setPlanViewTab('sprints')}
                        >
                            <Text style={[styles.planTabLabel, planViewTab === 'sprints' && styles.planTabLabelActive]}>Sprint</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.planTab, planViewTab === 'epics' && styles.planTabActive]}
                            onPress={() => setPlanViewTab('epics')}
                        >
                            <Text style={[styles.planTabLabel, planViewTab === 'epics' && styles.planTabLabelActive]}>Epic & Backlog</Text>
                        </TouchableOpacity>
                    </View>

                    {planViewTab === 'sprints' ? (
                        <>
                            <Text style={styles.sectionTitle}>Sprint ({sprints.length})</Text>
                            {sprints.length === 0 ? (
                                <View style={styles.emptySprintCard}>
                                    <Icon name="layer-group" size={22} color="#ffab33" style={{ marginBottom: 8 }} />
                                    <Text style={styles.emptySprintTitle}>Chưa có sprint</Text>
                                    <Text style={styles.emptySprintSub}>
                                        Sprint giúp nhóm story theo chu kỳ và theo dõi tiến độ theo thời gian.
                                    </Text>
                                    {canEditProject ? (
                                        <TouchableOpacity style={styles.emptySprintBtn} onPress={openCreateSprintModal}>
                                            <Icon name="plus" size={14} color="#fff" />
                                            <Text style={styles.emptySprintBtnText}>Tạo sprint đầu tiên</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <Text style={styles.emptySprintMember}>Chưa có sprint. Chờ Owner/Management tạo sprint cho dự án.</Text>
                                    )}
                                </View>
                            ) : (
                                sprints.map((sprint) => {
                        const isOpen = Boolean(expandedSprints[sprint.sprint_id]);
                        const sprintStories = storiesBySprint[sprint.sprint_id] || [];
                        const sprintStatusUi = getSprintStatusUi(sprint.sprintStatus);
                        const allStoriesDone =
                            sprintStories.length > 0 &&
                            sprintStories.every((story) => String(story.storyStatus || '').toUpperCase() === 'DONE');
                        const shouldSuggestDone =
                            canEditProject &&
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
                                        {canEditProject ? (
                                            <TouchableOpacity style={styles.sprintActionBtn} onPress={() => openEditSprintModal(sprint)}>
                                                <Icon name="edit" size={12} color="#3b82f6" />
                                            </TouchableOpacity>
                                        ) : null}
                                        {canEditProject ? (
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

                                        {canEditProject ? (
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
                    })
                            )}
                        </>
                    ) : (
                        <>
                            <View style={styles.epicTabHeader}>
                                <Text style={styles.sectionTitle}>Epic & Backlog</Text>
                                {canEditProject ? (
                                    <TouchableOpacity style={styles.epicAddBtn} onPress={openEpicModal}>
                                        <Icon name="plus" size={13} color="#ffab33" />
                                        <Text style={styles.epicAddBtnText}>Epic</Text>
                                    </TouchableOpacity>
                                ) : null}
                            </View>

                            {epics.length === 0 && backlogStories.length === 0 ? (
                                <View style={styles.emptyEpicCard}>
                                    <Icon name="clipboard-list" size={22} color="#94a3b8" style={{ marginBottom: 8 }} />
                                    <Text style={styles.emptySprintTitle}>Chưa có epic và backlog</Text>
                                    <Text style={styles.emptySprintSub}>
                                        Tạo epic để nhóm theo tính năng lớn; story chưa gán epic nằm ở Backlog.
                                    </Text>
                                    {canEditProject ? (
                                        <TouchableOpacity style={styles.emptySprintBtn} onPress={openEpicModal}>
                                            <Icon name="plus" size={14} color="#fff" />
                                            <Text style={styles.emptySprintBtnText}>Tạo epic đầu tiên</Text>
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                            ) : (
                                <>
                                    <View style={styles.epicCard}>
                                        <TouchableOpacity style={styles.epicHeaderRow} onPress={() => toggleEpicBucket('__backlog__')}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.epicName}>Backlog · chưa gán epic</Text>
                                                <Text style={styles.epicMeta}>{backlogStories.length} story</Text>
                                            </View>
                                            <Icon name={expandedEpics.__backlog__ ? 'chevron-up' : 'chevron-down'} size={14} color="#666" />
                                        </TouchableOpacity>
                                        {expandedEpics.__backlog__ ? (
                                            <View style={styles.epicBody}>
                                                {backlogStories.length === 0 ? (
                                                    <Text style={styles.epicEmptyHint}>Không có story chưa gán epic.</Text>
                                                ) : null}
                                                {backlogStories.map((story, idx) => {
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
                                                                <Image source={getAvatarSource(assignee)} style={styles.avatar} />
                                                            </View>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                                {canEditProject ? (
                                                    <View style={styles.createRow}>
                                                        <TextInput
                                                            style={styles.createInput}
                                                            placeholder="Story mới (chưa gán epic)..."
                                                            value={newStoryBacklog}
                                                            onChangeText={setNewStoryBacklog}
                                                        />
                                                        <TouchableOpacity style={styles.createBtn} onPress={() => createStoryInEpicView(null)}>
                                                            <Text style={styles.createBtnText}>Create</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                ) : null}
                                            </View>
                                        ) : null}
                                    </View>

                                    {epics.map((epic) => {
                                        const eid = epic.epic_id;
                                        const epicStoriesList = storiesByEpicId[eid] || [];
                                        const isOpen = Boolean(expandedEpics[eid]);
                                        return (
                                            <View key={String(eid)} style={styles.epicCard}>
                                                <TouchableOpacity style={styles.epicHeaderRow} onPress={() => toggleEpicBucket(eid)}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.epicName}>{epic.epicName || 'Epic'}</Text>
                                                        <Text style={styles.epicMeta} numberOfLines={2}>
                                                            {(epic.description && String(epic.description).trim()) || 'Không có mô tả'} · {epicStoriesList.length} story
                                                        </Text>
                                                    </View>
                                                    <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} color="#666" />
                                                </TouchableOpacity>
                                                {isOpen ? (
                                                    <View style={styles.epicBody}>
                                                        {epicStoriesList.length === 0 ? (
                                                            <Text style={styles.epicEmptyHint}>Chưa có story trong epic này.</Text>
                                                        ) : null}
                                                        {epicStoriesList.map((story, idx) => {
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
                                                                        <Image source={getAvatarSource(assignee)} style={styles.avatar} />
                                                                    </View>
                                                                </TouchableOpacity>
                                                            );
                                                        })}
                                                        {canEditProject ? (
                                                            <View style={styles.createRow}>
                                                                <TextInput
                                                                    style={styles.createInput}
                                                                    placeholder="Story mới trong epic..."
                                                                    value={newStoryByEpic[eid] || ''}
                                                                    onChangeText={(text) => setNewStoryByEpic((prev) => ({ ...prev, [eid]: text }))}
                                                                />
                                                                <TouchableOpacity style={styles.createBtn} onPress={() => createStoryInEpicView(eid)}>
                                                                    <Text style={styles.createBtnText}>Create</Text>
                                                                </TouchableOpacity>
                                                            </View>
                                                        ) : null}
                                                    </View>
                                                ) : null}
                                            </View>
                                        );
                                    })}
                                </>
                            )}
                        </>
                    )}
                </ScrollView>
            )}

            {canEditProject && planViewTab === 'sprints' ? (
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

            <Modal transparent visible={epicModalVisible} animationType="fade" onRequestClose={() => setEpicModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Tạo Epic</Text>
                        <TextInput style={styles.modalInput} value={newEpicName} onChangeText={setNewEpicName} placeholder="Tên epic" />
                        <TextInput
                            style={styles.modalInput}
                            value={newEpicDesc}
                            onChangeText={setNewEpicDesc}
                            placeholder="Mô tả (tùy chọn)"
                            multiline
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={() => setEpicModalVisible(false)}>
                                <Text style={styles.modalCancelText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, styles.modalSave]} onPress={saveEpic}>
                                <Text style={styles.modalSaveText}>Tạo</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                transparent
                visible={projectInfoVisible}
                animationType="none"
                onRequestClose={closeProjectInfo}
            >
                <View style={styles.projectInfoRoot}>
                    <TouchableOpacity style={styles.projectInfoBackdrop} activeOpacity={1} onPress={closeProjectInfo} />
                    <Animated.View style={[styles.projectInfoSheet, { transform: [{ translateY: slideY }] }]}>
                        <View style={styles.projectInfoHandle} />
                        <View style={styles.infoHeader}>
                            <Text style={styles.infoTitle}>Thông tin dự án</Text>
                            <TouchableOpacity onPress={closeProjectInfo} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Icon name="times" size={18} color="#555" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.projectInfoScroll}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            <Text style={styles.projectInfoName}>{projectDetail?.projectName || projectName || '—'}</Text>
                            <Text style={styles.projectInfoDesc}>{projectDetail?.projectDescription || 'Chưa có mô tả'}</Text>

                            <View style={styles.statGrid}>
                                <View style={styles.statCell}>
                                    <Text style={styles.statValue}>{sprints.length}</Text>
                                    <Text style={styles.statLabel}>Sprint</Text>
                                </View>
                                <View style={styles.statCell}>
                                    <Text style={styles.statValue}>{stories.length}</Text>
                                    <Text style={styles.statLabel}>Story</Text>
                                </View>
                                <View style={styles.statCell}>
                                    <Text style={styles.statValue}>{tasks.length}</Text>
                                    <Text style={styles.statLabel}>Subtask</Text>
                                </View>
                            </View>

                            <View style={styles.progressBlock}>
                                <View style={styles.progressHeader}>
                                    <Text style={styles.progressTitle}>Tiến độ dự án</Text>
                                    <Text style={styles.progressPercent}>{projectCompletion.percent}%</Text>
                                </View>
                                <View style={styles.progressTrack}>
                                    <View style={[styles.progressFill, { width: `${Math.min(100, projectCompletion.percent)}%` }]} />
                                </View>
                                <Text style={styles.progressHint}>{projectCompletion.label}</Text>
                            </View>

                            <View style={styles.projectCodeBox}>
                                <Text style={styles.projectCodeLabel}>Mã / ID dự án</Text>
                                <Text style={styles.projectCodeValue}>{projectId || '--'}</Text>
                                <Text style={styles.projectTimeLabel}>Thời gian dự án</Text>
                                <Text style={styles.projectTimeValue}>
                                    {formatDate(projectDetail?.timeStart)} — {formatDate(projectDetail?.timeEnd)}
                                </Text>
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

                            <Text style={styles.memberTitle}>Thành viên ({users.length})</Text>
                            {users.length === 0 ? <Text style={styles.emptyText}>Chưa có thành viên</Text> : null}
                            {users.map((item) => {
                                const ownerUserId = projectDetail?.projectowner;
                                const isProjectCreator = Number(item.user_id) === Number(ownerUserId);
                                const label = mapRoleLabel(item.roleName);
                                const rawRole = String(item.roleName || '');
                                const canOwnerEditThis =
                                    myRole === 'Owner' && !isProjectCreator && Number(item.user_id) !== Number(userData?.user_id);

                                return (
                                    <View key={String(item.user_id)} style={styles.memberCard}>
                                        <View style={styles.memberRow}>
                                            <View style={styles.memberLeft}>
                                                <Image source={getAvatarSource(item)} style={styles.memberAvatar} />
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.memberName}>{item.username}</Text>
                                                    <Text style={styles.memberEmail}>{item.email}</Text>
                                                </View>
                                            </View>
                                            <View style={styles.roleBadge}>
                                                <Text style={styles.roleText}>{label}</Text>
                                            </View>
                                        </View>
                                        {canOwnerEditThis ? (
                                            <View style={styles.memberActions}>
                                                {rawRole !== 'Owner' && label !== 'Owner' ? (
                                                    <TouchableOpacity
                                                        style={styles.memberActionBtn}
                                                        onPress={() =>
                                                            Alert.alert('Gỡ thành viên', `Xóa ${item.username} khỏi dự án?`, [
                                                                { text: 'Hủy', style: 'cancel' },
                                                                {
                                                                    text: 'Xóa',
                                                                    style: 'destructive',
                                                                    onPress: () => removeProjectMember(item.user_id),
                                                                },
                                                            ])
                                                        }
                                                    >
                                                        <Icon name="user-minus" size={12} color="#b91c1c" />
                                                        <Text style={styles.memberActionDanger}>Xóa</Text>
                                                    </TouchableOpacity>
                                                ) : null}
                                                {label === 'Member' ? (
                                                    <TouchableOpacity
                                                        style={styles.memberActionBtn}
                                                        onPress={() =>
                                                            Alert.alert('Management', `Đưa ${item.username} lên Management?`, [
                                                                { text: 'Hủy', style: 'cancel' },
                                                                { text: 'OK', onPress: () => setMemberRole(item.user_id, 2) },
                                                            ])
                                                        }
                                                    >
                                                        <Icon name="arrow-up" size={12} color="#1d4ed8" />
                                                        <Text style={styles.memberActionPrimary}>Lên Management</Text>
                                                    </TouchableOpacity>
                                                ) : null}
                                                {(label === 'Management' || rawRole === 'Leader') && !isProjectCreator ? (
                                                    <TouchableOpacity
                                                        style={styles.memberActionBtn}
                                                        onPress={() =>
                                                            Alert.alert('Hạ vai trò', `Chuyển ${item.username} về Member?`, [
                                                                { text: 'Hủy', style: 'cancel' },
                                                                { text: 'OK', onPress: () => setMemberRole(item.user_id, 1) },
                                                            ])
                                                        }
                                                    >
                                                        <Icon name="arrow-down" size={12} color="#475569" />
                                                        <Text style={styles.memberActionMuted}>Hạ xuống Member</Text>
                                                    </TouchableOpacity>
                                                ) : null}
                                            </View>
                                        ) : null}
                                    </View>
                                );
                            })}

                            {isCreator && myRole === 'Owner' ? (
                                <View style={styles.deleteProjectSection}>
                                    <Text style={styles.deleteProjectTitle}>Xóa dự án</Text>
                                    <Text style={styles.deleteProjectHint}>
                                        Nhập đúng mã ID dự án ({String(projectId)}) vào ô bên dưới, sau đó bấm Xóa dự án. Thao tác không hoàn tác.
                                    </Text>
                                    <TextInput
                                        style={styles.deleteProjectInput}
                                        placeholder="ID dự án để xác nhận"
                                        placeholderTextColor="#94a3b8"
                                        value={deleteProjectConfirmInput}
                                        onChangeText={setDeleteProjectConfirmInput}
                                        autoCapitalize="none"
                                    />
                                    <TouchableOpacity
                                        style={[
                                            styles.deleteProjectBtn,
                                            String(deleteProjectConfirmInput).trim() !== String(projectId) && styles.deleteProjectBtnDisabled,
                                        ]}
                                        disabled={String(deleteProjectConfirmInput).trim() !== String(projectId)}
                                        onPress={() =>
                                            Alert.alert('Xóa vĩnh viễn', 'Toàn bộ sprint, story, subtask và chat của dự án sẽ bị xóa.', [
                                                { text: 'Hủy', style: 'cancel' },
                                                { text: 'Xóa dự án', style: 'destructive', onPress: submitDeleteProject },
                                            ])
                                        }
                                    >
                                        <Icon name="trash-alt" size={14} color="#fff" />
                                        <Text style={styles.deleteProjectBtnText}>Xóa dự án</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : null}

                            <View style={{ height: 24 }} />
                        </ScrollView>
                    </Animated.View>
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
    planTabBar: {
        flexDirection: 'row',
        backgroundColor: '#eef2f7',
        borderRadius: 12,
        padding: 4,
        marginBottom: 14,
    },
    planTab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    planTabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 2 },
    planTabLabel: { fontSize: 13, fontWeight: '600', color: '#64748b' },
    planTabLabelActive: { color: '#111827' },
    emptySprintCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 20,
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e8ecf1',
    },
    emptySprintTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 6, textAlign: 'center' },
    emptySprintSub: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19, marginBottom: 14 },
    emptySprintBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffad44',
        borderRadius: 12,
        paddingHorizontal: 18,
        paddingVertical: 11,
        gap: 8,
    },
    emptySprintBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    emptySprintMember: { fontSize: 13, color: '#64748b', textAlign: 'center' },
    epicTabHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    epicAddBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff7ed',
        borderWidth: 1,
        borderColor: '#fed7aa',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 6,
    },
    epicAddBtnText: { fontSize: 12, fontWeight: '700', color: '#c2410c' },
    emptyEpicCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 20,
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e8ecf1',
    },
    epicCard: { backgroundColor: '#fff', borderRadius: 14, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#eef2f7' },
    epicHeaderRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
    epicName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
    epicMeta: { fontSize: 12, color: '#64748b', marginTop: 4 },
    epicBody: { borderTopWidth: 1, borderTopColor: '#f0f2f4', padding: 12 },
    epicEmptyHint: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic', marginBottom: 8 },
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
    projectInfoRoot: { flex: 1, justifyContent: 'flex-start' },
    projectInfoBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
    projectInfoSheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 60,
        maxHeight: '88%',
        backgroundColor: '#fff',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        paddingTop: Platform.OS === 'ios' ? 10 : 12,
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 16,
    },
    projectInfoHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#e5e7eb',
        alignSelf: 'center',
        marginBottom: 10,
    },
    projectInfoScroll: { flexGrow: 0 },
    projectInfoName: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 6 },
    projectInfoDesc: { fontSize: 13, color: '#64748b', lineHeight: 19, marginBottom: 14 },
    statGrid: { flexDirection: 'row', marginBottom: 14, gap: 8 },
    statCell: {
        flex: 1,
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        paddingVertical: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    statValue: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
    statLabel: { fontSize: 11, color: '#64748b', marginTop: 2, fontWeight: '600' },
    progressBlock: { marginBottom: 14 },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    progressTitle: { fontSize: 13, fontWeight: '700', color: '#334155' },
    progressPercent: { fontSize: 15, fontWeight: '800', color: '#ffad44' },
    progressTrack: { height: 8, borderRadius: 999, backgroundColor: '#e2e8f0', overflow: 'hidden' },
    progressFill: { height: 8, borderRadius: 999, backgroundColor: '#ffad44' },
    progressHint: { fontSize: 11, color: '#94a3b8', marginTop: 6 },
    infoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    infoTitle: { fontSize: 17, fontWeight: '700', color: '#222' },
    projectCodeBox: { backgroundColor: '#f6f8fb', borderRadius: 12, padding: 12, marginBottom: 14 },
    projectCodeLabel: { color: '#667085', fontSize: 12 },
    projectCodeValue: { color: '#1d2939', fontSize: 16, fontWeight: '700', marginTop: 4 },
    projectTimeLabel: { color: '#667085', fontSize: 12, marginTop: 10 },
    projectTimeValue: { color: '#334155', fontSize: 13, fontWeight: '600', marginTop: 4 },
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
    memberCard: {
        borderWidth: 1,
        borderColor: '#eef2f7',
        borderRadius: 12,
        padding: 10,
        marginBottom: 10,
        backgroundColor: '#fafcff',
    },
    memberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    memberLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
    memberAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10, backgroundColor: '#eee' },
    memberName: { fontSize: 14, fontWeight: '600', color: '#222' },
    memberEmail: { fontSize: 11, color: '#667085' },
    memberActions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 8 },
    memberActionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
    memberActionDanger: { color: '#b91c1c', fontSize: 11, fontWeight: '700', marginLeft: 6 },
    memberActionPrimary: { color: '#1d4ed8', fontSize: 11, fontWeight: '700', marginLeft: 6 },
    memberActionMuted: { color: '#475569', fontSize: 11, fontWeight: '700', marginLeft: 6 },
    roleBadge: { backgroundColor: '#eef2ff', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
    roleText: { color: '#3538cd', fontSize: 11, fontWeight: '700' },
    deleteProjectSection: {
        marginTop: 8,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#fecaca',
        backgroundColor: '#fef2f2',
    },
    deleteProjectTitle: { fontSize: 14, fontWeight: '800', color: '#991b1b', marginBottom: 6 },
    deleteProjectHint: { fontSize: 12, color: '#7f1d1d', lineHeight: 17, marginBottom: 10 },
    deleteProjectInput: {
        borderWidth: 1,
        borderColor: '#fca5a5',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 9,
        marginBottom: 10,
        backgroundColor: '#fff',
        fontSize: 14,
        color: '#111827',
    },
    deleteProjectBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#dc2626',
        borderRadius: 10,
        paddingVertical: 11,
    },
    deleteProjectBtnDisabled: { backgroundColor: '#fca5a5' },
    deleteProjectBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    emptyText: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic', marginBottom: 8 },
    notiRow: { borderWidth: 1, borderColor: '#eef2f7', borderRadius: 10, padding: 10, marginBottom: 8, backgroundColor: '#fafcff' },
    notiMessage: { color: '#334155', fontSize: 12, fontWeight: '600' },
    notiTime: { color: '#94a3b8', fontSize: 11, marginTop: 4 },
});