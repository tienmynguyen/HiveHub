// Calendar.js
import * as React from 'react';
import { SafeAreaView, ScrollView, Text, View } from 'react-native';
import Background from '../components/Background2';
import GanttChart from '../components/GanttChartCalendar';
import Config from "./config.json";
import { AuthContext } from "../context/AuthContext";
import {useContext, useEffect, useState} from "react";
import {useIsFocused} from "@react-navigation/native";
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
            const response = await fetch(`${Config.URLAPI}/getalltaskbyuser?userId=${userData.user_id}`);

            const data = await response.json();
            setTasks(data);

        } catch (error) {
            console.error(error);
        }
    }

    const [currentMonth, setCurrentMonth] = React.useState(new Date());

    return (
        <Background>
            <SafeAreaView style={{marginTop:80}}>
                <ScrollView>
                    <View style={{height:500}}>
                        <GanttChart tasks={tasks} currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} />
                    </View>
                </ScrollView>
            </SafeAreaView>
        </Background>
    );
}
