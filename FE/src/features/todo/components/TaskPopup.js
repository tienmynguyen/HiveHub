import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5'; // Dùng icon cho đẹp

const { width } = Dimensions.get('window');

const Popup = ({ task, onClose }) => {
    if (!task) return null;

    return (
        <Modal
            transparent={true}
            animationType="fade"
            visible={true}
            onRequestClose={onClose}
        >
            <TouchableOpacity 
                style={styles.overlay} 
                activeOpacity={1} 
                onPress={onClose}
            >
                {/* Chặn sự kiện bấm vào card để không bị đóng modal */}
                <TouchableOpacity activeOpacity={1} style={styles.popupCard}>
                    
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.iconContainer}>
                            <Icon name="tasks" size={24} color="#ffab33" />
                        </View>
                        <Text style={styles.title} numberOfLines={2}>{task.taskName}</Text>
                    </View>

                    {/* Divider */}
                    <View style={styles.divider} />

                    {/* Body Info */}
                    <View style={styles.body}>
                        <View style={styles.row}>
                            <Icon name="project-diagram" size={16} color="#888" style={styles.rowIcon} />
                            <Text style={styles.label}>Dự án:</Text>
                            <Text style={styles.value}>{task.project?.projectName || "Chưa phân loại"}</Text>
                        </View>

                        <View style={styles.row}>
                            <Icon name="calendar-alt" size={16} color="#888" style={styles.rowIcon} />
                            <Text style={styles.label}>Bắt đầu:</Text>
                            <Text style={styles.value}>{formatDate(task.timeStart)}</Text>
                        </View>

                        <View style={styles.row}>
                            <Icon name="flag-checkered" size={16} color="#888" style={styles.rowIcon} />
                            <Text style={styles.label}>Kết thúc:</Text>
                            <Text style={styles.value}>{formatDate(task.timeEnd)}</Text>
                        </View>
                    </View>

                    {/* Footer Button */}
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Text style={styles.closeButtonText}>Đóng</Text>
                    </TouchableOpacity>

                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

function formatDate(isoString) {
    if (!isoString) return "N/A";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "N/A";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Nền mờ tối
        justifyContent: 'center',
        alignItems: 'center',
    },
    popupCard: {
        width: width * 0.85,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        // Hiệu ứng đổ bóng
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    header: {
        alignItems: 'center',
        marginBottom: 15,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#fff5e6', // Cam rất nhạt
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        width: '100%',
        marginBottom: 15,
    },
    body: {
        marginBottom: 20,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    rowIcon: {
        width: 25,
        textAlign: 'center',
        marginRight: 10,
    },
    label: {
        fontSize: 16,
        color: '#666',
        marginRight: 5,
        fontWeight: '500',
    },
    value: {
        fontSize: 16,
        color: '#333',
        fontWeight: 'bold',
        flex: 1,
    },
    closeButton: {
        backgroundColor: '#ffab33',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 16,
        color: 'white',
        fontWeight: 'bold',
    },
});

export default Popup;