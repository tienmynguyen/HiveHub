import React from 'react';
import { Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';

import Home from '../features/todo/screens/Home';
import Profile from '../features/profile/screens/Profile';
import Calendar from '../features/calendar/screens/Calendar';
import Note from '../features/notes/screens/Note';
import Project from '../features/todo/screens/Project';
import Chat from '../features/chat/screens/Chat';
import Plan from '../features/todo/screens/Plan';
import TaskDetail from '../features/todo/screens/TaskDetail';
import AddTask from '../features/todo/screens/AddTask';
import AddProject from '../features/todo/screens/AddProject';
import TransferToken from '../features/wallet/screens/TransferToken';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
    return (
        <Tab.Navigator
            initialRouteName="Home"
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;
                    switch (route.name) {
                        case 'Home':
                            iconName = focused ? 'home' : 'home-outline';
                            break;
                        case 'Profile':
                            iconName = focused ? 'man' : 'man-outline';
                            break;
                        case 'Calendar':
                            iconName = focused ? 'calendar' : 'calendar-outline';
                            break;
                        case 'Note':
                            iconName = focused ? 'book' : 'book-outline';
                            break;
                        case 'Project':
                            iconName = focused ? 'list' : 'list-outline';
                            break;
                        case 'TransferToken':
                            iconName = focused ? 'swap-horizontal' : 'swap-horizontal-outline';
                            break;
                    }
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#ffad44',
                tabBarInactiveTintColor: 'grey',
                tabBarLabelStyle: { fontSize: 10 },
                tabBarStyle: {
                    height: Platform.OS === 'android' ? 60 : 80, // Android thấp hơn để không bị che
                    paddingBottom: Platform.OS === 'android' ? 10 : 20,
                    paddingTop: 5,
                },
            })}
        >
            <Tab.Screen name="Home" component={Home} />
            <Tab.Screen name="Calendar" component={Calendar} />
            <Tab.Screen name="Project" component={Project} />
            <Tab.Screen name="Note" component={Note} />
             <Tab.Screen name="TransferToken" component={TransferToken} />
            <Tab.Screen name="Profile" component={Profile} />
           
        </Tab.Navigator>
    );
}

export default function MainStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="Chat" component={Chat} />
            <Stack.Screen name="Plan" component={Plan} />
            <Stack.Screen name="TaskDetail" component={TaskDetail} />
            <Stack.Screen name="AddTask" component={AddTask} />
            <Stack.Screen name="AddProject" component={AddProject} />
        </Stack.Navigator>
    );
}
