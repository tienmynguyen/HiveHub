// Calendar.js
import * as React from 'react';
import { SafeAreaView, ScrollView, Text, View } from 'react-native';
import Background from '../../../components/common/Background2';
import GanttChart from '../components/GanttChartCalendar';
import { AuthContext } from "../../auth/context/AuthContext";
import {useContext, useEffect, useState} from "react";
import {useIsFocused} from "@react-navigation/native";
import axios from 'axios';
import { endpoints } from '../../../config/endpoints';
export default function Calendar({ navigation }) {
    const { userData } = useContext(AuthContext);
    const [tasks, setTasks] = useState([]);
    const isFocused = useIsFocused();

    useEffect(() => {
        if (isFocused) {
            fetchData();

        }
    }, [isFocused]);

    async function fetchData() {
        try {
            const { data } = await axios.get(endpoints.tasks.getByUser(userData.user_id));
            setTasks(data);

        } catch (error) {
            console.error(error);
        }
    }

    const [currentMonth, setCurrentMonth] = React.useState(new Date());

    return (
        <Background>
            <SafeAreaView style={{marginTop:0}}>
                <ScrollView>
                    <View style={{height:"100%"}}>
                        <GanttChart tasks={tasks} currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} />
                    </View>
                </ScrollView>
            </SafeAreaView>
        </Background>
    );
}
