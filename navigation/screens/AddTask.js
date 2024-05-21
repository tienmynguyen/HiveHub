import React from 'react';
import {View, Text, FlatList, StyleSheet, SafeAreaView, TouchableOpacity, TextInput,} from 'react-native';

export default function AddTask({ route }) {
    const { projectId } = route.params;


    return (
        <SafeAreaView>

            <View style={{padding:15, marginTop:80}}>
                <View style={styles.TaskItem}>

                        <Text style={{fontSize:20,color:"#ffad44"}}>Task:</Text>
                        <TextInput
                            style={styles.input}


                            placeholder=""

                        />
                        <Text>Deadline:</Text>
                        <TextInput
                            style={styles.input}


                            placeholder=""

                        />

                    <View>

                    </View>
                </View>
                <View style={styles.TaskItem2}>
                    <Text>Phụ trách: </Text>
                    <TextInput
                        style={styles.input}


                        placeholder=""

                    />
                    <Text>Ngày bắt đầu: </Text>
                    <TextInput
                        style={styles.input}


                        placeholder=""

                    />
                    <Text>Ngày kết thúc: </Text>
                    <TextInput
                        style={styles.input}


                        placeholder=""

                    />
                    <Text>Deadline: </Text>
                    <TextInput
                        style={styles.input}


                        placeholder=""

                    />
                </View>
            </View>

            <View>
                <TouchableOpacity style={styles.addbtn} >
                    <Text style={styles.taddbtn}>
                        ADD
                    </Text>
                </TouchableOpacity>
            </View>

        </SafeAreaView>

    );
}
const styles = StyleSheet.create({
    TaskItem:{
        borderColor:"#ffad44",
        marginTop:15,

        borderWidth:1,
        borderRadius:15,
        padding: 15,

        gap:15,


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
    input: {

        borderColor:"#ffad44",
        height: 40,

        marginLeft:12,
        borderWidth: 1,
        padding: 10,
        borderRadius:5,
    },
    addbtn:{

        flexDirection:'row',
        alignItems:'center',
        justifyContent:'center',


    },
    taddbtn:{
        color:'#ffffff',

        backgroundColor:'#ffad44',
        fontSize:25,
        borderRadius:15,
        padding:5,

    },

})