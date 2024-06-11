import * as React from 'react';
import {View, Text, StyleSheet, FlatList, Image, TouchableOpacity} from 'react-native';
import {useState} from 'react';
import { RadioButton } from 'react-native-paper';
import Background from '../components/Background2';
import Config from "./config.json";

const dummyTasks1 = [
{
    id: "1",
    title:"Phân tích thiết kế hệ thống",
    time_start:"01/01/2024",
    time_end:"02/01/2024",
    deadline:"03/01/2024",
    content:" bla bla bla bla bla bla bla",
    status:"done",
    user:"Tmy",
    projectId: "1",
},

]
const dummyTasks2 = [
    {
        id: "2",
        title:"Thiết kế giao diện",
        time_start:"01/01/2024",
        time_end:"02/01/2024",
        deadline:"03/01/2024",
        content:" bla bla bla bla bla bla bla",
        status:"done",
        user:"Tmy",
        projectId: "1",
    },{
        id: "3",
        title:"FrontEnd",
        time_start:"01/01/2024",
        time_end:"02/01/2024",
        deadline:"03/01/2024",
        content:" bla bla bla bla bla bla bla",
        status:"done",
        user:"Tmy",
        projectId: "1",
    }


]

const dummyTasks3 = [
{
    id: "1",
    title:"Phân tích thiết kế hệ thống",
    time_start:"01/01/2024",
    time_end:"02/01/2024",
    deadline:"03/01/2024",
    content:" bla bla bla bla bla bla bla",
    status:"done",
    user:"Tmy",
    projectId: "1",
},

]

async function fetchData() {
    try {
        const response = await fetch(`${Config.URLAPI}/getprjectbyuserId?userId=${userData.user_id}`);
        const data = await response.json();
        setTasks(data);
    } catch (error) {
        console.error(error);
    }
}

export default function Home({ navigation }) {
    const [tasks, setTasks] = useState(dummyTasks1);
    const [checked, setChecked] = React.useState('first');
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    const gotoTaskDetail = (item) =>{

        navigation.navigate('TaskDetail', {task:item });

    };
    return (
        <Background>
            <View style={styles.header}>
                <TouchableOpacity><Text style={styles.headerText}>Yesterday</Text></TouchableOpacity>
                <Text style={styles.headerTextToday}>Today</Text>
                <TouchableOpacity><Text style={styles.headerText}>Tomorrow</Text></TouchableOpacity>
            </View>
            <View style={styles.date}>
                <Text style={styles.dateText}>Today</Text>
                <Text>{formattedDate}</Text>
            </View>
            <View style={styles.taskContainer}>
                            <View style={styles.taskHeader}>
                                <Text style={styles.taskHeaderText}>Morning</Text>
                                <Text>7 am</Text>
                            </View>
                            <FlatList
                                data={dummyTasks1}
                                renderItem={({ item }) =>
                                    <View style={styles.taskItem}>
                                        <RadioButton
                                            value={item.id}

                                            onPress={() => setChecked('first')}
                                        />
                                        <TouchableOpacity style={{flexDirection:"column",gap:3,padding:10}} onPress={()=>gotoTaskDetail(item)}>
                                            <Text style={{fontWeight: 'bold',}}>{item.title}</Text>
                                           <Text>{item.content}</Text>
                                        </TouchableOpacity>
                                    </View>
                                }
                            />
                        </View>

                        <View style={styles.taskContainer}>
                            <View style={styles.taskHeader}>
                                <Text style={styles.taskHeaderText}>Noon</Text>
                                <Text>10 am</Text>
                            </View>
                            <FlatList
                                data={dummyTasks2}
                                renderItem={({ item }) =>
                                    <View style={styles.taskItem}>
                                        <RadioButton
                                            value={item.id}

                                            onPress={() => setChecked('first')}
                                        />
                                        <TouchableOpacity style={{flexDirection:"column",gap:3,padding:10}} onPress={()=>gotoTaskDetail(item)}>
                                            <Text style={{fontWeight: 'bold',}}>{item.title}</Text>
                                            <Text>{item.content}</Text>
                                        </TouchableOpacity>
                                    </View>
                                }
                            />
                        </View>

                        <View style={styles.taskContainer}>
                                                    <View style={styles.taskHeader}>
                                                        <Text style={styles.taskHeaderText}>Afternoon</Text>
                                                        <Text>3 pm</Text>
                                                    </View>
                            <FlatList
                                data={dummyTasks3}
                                renderItem={({ item }) =>
                                    <View style={styles.taskItem}>
                                        <RadioButton
                                            value={item.id}

                                            onPress={() => setChecked('first')}
                                        />
                                        <TouchableOpacity style={{flexDirection:"column",gap:3,padding:10}} onPress={()=>gotoTaskDetail(item)}>
                                            <Text style={{fontWeight: 'bold',}}>{item.title}</Text>
                                            <Text>{item.content}</Text>
                                        </TouchableOpacity>
                                    </View>
                                }
                            />
                                                </View>
            {/* Repeat similar structure for Noon and Afternoon */}
            <TouchableOpacity style={styles.addbtnbox}>
                <Image source={require("./images/add.png")}
                       style={styles.addbtn}
                />
            </TouchableOpacity>
        </Background>
    );
}

const styles = StyleSheet.create({
    header: {
        marginTop:80,
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },

    headerText: {
        borderColor: '#ffad44',
        width: 70,
        height: 70,
        borderWidth: 1,
        borderRadius: 50,
        textAlignVertical: 'center',
        textAlign: 'center',
        fontSize: 14,
        fontWeight: 'bold',
    },
     headerTextToday: {

            textAlignVertical: 'center',
            textAlign: 'center',
            fontSize: 18,
            fontWeight: 'bold',
        },
    date: {
        marginTop: 10,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dateText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    taskContainer: {
        marginTop:15,
        marginLeft: 10,
        marginRight: 10,
    },
    taskHeader: {
        paddingLeft: 10,
        paddingRight: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    taskHeaderText: {
        fontSize: 18,
    },
    taskItem: {

        backgroundColor: "#ffb267",

            borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        marginTop:10,

    },
    addbtn:{


    },
    addbtnbox:{
        marginTop:30,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
