import React from 'react';
import {View, Text, FlatList, StyleSheet, SafeAreaView, TouchableOpacity, Image,} from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from "react-native-vector-icons/FontAwesome";


const dummyTasks1 = [
    {
        id: "1",
        title:"Phân tích thiết kế hệ thống",
        time_start:"01/01/2024",
        time_end:"02/01/2024",
        deadline:"03/01/2024",
        status:"Done",
        user:"Tmy",
        projectId: "1",
    },{
        id: "2",
        title:"Thiết kế giao diện",
        time_start:"01/01/2024",
        time_end:"02/01/2024",
        deadline:"03/01/2024",
        status:"Done",
        user:"Tmy",
        projectId: "1",
    },{
        id: "3",
        title:"FrontEnd",
        time_start:"01/01/2024",
        time_end:"02/01/2024",
        deadline:"03/01/2024",
        status:"Done",
        user:"Tmy",
        projectId: "1",
    },{
        id: "4",
        title:"Backend",
        time_start:"01/01/2024",
        time_end:"02/01/2024",
        deadline:"03/01/2024",
        status:"Doing",
        user:"Tmy",
        projectId: "1",
    },{
        id: "5",
        title:"Build",
        time_start:"01/01/2024",
        time_end:"02/01/2024",
        deadline:"03/01/2024",
        status:"To do",
        user:"Tmy",
        projectId: "1",
    },


]
export default function Plan({navigation , route }) {
    const { projectId } = route.params;

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Done':
                return styles.done;
            case 'Doing':
                return styles.doing;
            case 'To do':
                return styles.todo;
            default:
                return styles.default;
        }
    };
    const gotoTaskDetail = (item) =>{

            navigation.navigate('TaskDetail', {task:item });

    };
    const gotoAddTask = (projectId) =>{
        navigation.navigate('AddTask',{projectId:projectId})
    }
    return (
        <SafeAreaView >
            <View style={{padding:15, marginTop:80}}>
                <View style={{flexDirection:'row', justifyContent: 'space-between',}}>
                    <TouchableOpacity onPress={()=>{navigation.navigate('Project')}}>

                    </TouchableOpacity>
                    <Text style={{fontSize:25,}}>Plan</Text>
                    <TouchableOpacity ></TouchableOpacity>
                </View>
                <FlatList  data={dummyTasks1}
                           keyExtractor={(item) => item.id} // Chỉ định keyExtractor ở đây
                           renderItem={({ item }) =>
                               <TouchableOpacity style={styles.TaskItem}  onPress={()=>gotoTaskDetail(item)}>
                                   <View style={{flexDirection:"column",justifyContent:"center"}}>
                                       <Text style={{fontSize:20,color:"#000000"}}>{item.title}</Text>
                                       <Text>{item.deadline}</Text>
                                   </View>
                                   <View>
                                       <Text style={getStatusStyle(item.status)}>{item.status}</Text>
                                   </View>
                               </TouchableOpacity>

                }/>
                <TouchableOpacity style={styles.addbtnbox} onPress={()=>gotoAddTask(projectId)}>
                    <Image source={require("./images/add.png")}
                           style={styles.addbtn}
                    />
                </TouchableOpacity>
            </View>
        </SafeAreaView>

    );
}
const styles = StyleSheet.create({
    TaskItem:{
        backgroundColor:"#ffad44",
        borderColor:"#000000",
        marginTop:15,
        flexDirection: 'row',
        borderWidth:1,
        borderRadius:15,
        padding: 15,

        gap:15,
        alignItems:"center",
        justifyContent:"space-between"
    },
    done: {
        color: '#009d2c', // Màu xanh lá cho trạng thái done
    },
    doing: {
        color: '#d37e22', // Màu vàng cho trạng thái doing
    },
    todo: {
        color: '#e8174a', // Màu đỏ cho trạng thái todo
    },
    addbtnbox:{
        marginTop:30,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },


})