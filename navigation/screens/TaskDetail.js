import React from 'react';
import {View, Text, FlatList, StyleSheet, SafeAreaView, TouchableOpacity,} from 'react-native';

export default function PlanDetail({ route }) {
    const { task } = route.params;
    const getStatusStyle = (status) => {
        switch (status) {
            case 'done':
                return styles.done;
            case 'doing':
                return styles.doing;
            case 'to do':
                return styles.todo;
            default:
                return styles.default;
        }
    };


    return (
        <SafeAreaView>

                <View style={{padding:15, marginTop:80}}>

                    <View style={styles.TaskItem}>
                        <View style={{flexDirection:"column",justifyContent:"center"}}>
                            <Text style={{fontSize:20,color:"#ffad44"}}>{task.title}</Text>
                            <Text>{task.deadline}</Text>
                        </View>
                        <View>
                            <Text style={getStatusStyle(task.status)}>{task.status}</Text>
                        </View>
                    </View>
                    <View style={styles.TaskItem2}>
                        <Text>Phụ trách: {task.user}</Text>
                        <Text>Ngày bắt đầu: {task.time_start}</Text>
                        <Text>Ngày kết thúc: {task.time_end}</Text>
                        <Text>Deadline: {task.deadline}</Text>
                    </View>
                </View>



        </SafeAreaView>

    );
}
const styles = StyleSheet.create({
    TaskItem:{
        borderColor:"#ffad44",
        marginTop:15,
        flexDirection: 'row',
        borderWidth:1,
        borderRadius:15,
        padding: 15,

        gap:15,
        alignItems:"center",
        justifyContent:"space-between"
    },
    TaskItem2:{
        borderColor:"#ffad44",
        marginTop:15,
        flexDirection: 'column',
        borderWidth:1,
        borderRadius:15,
        padding: 15,

        gap:15,


    },
    done: {
        color: '#20BD4C', // Màu xanh lá cho trạng thái done
    },
    doing: {
        color: '#CCC403', // Màu vàng cho trạng thái doing
    },
    todo: {
        color: '#FF577F', // Màu đỏ cho trạng thái todo
    },

})