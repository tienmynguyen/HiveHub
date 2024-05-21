
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Home from './screens/Home';
import Profile from './screens/Profile';
import Calendar from './screens/Calendar';
import Note from './screens/Note';
import Project from './screens/Project';
import Chat from './screens/Chat';
import Plan from './screens/Plan';
import TaskDetail from './screens/TaskDetail';
import AddTask from './screens/AddTask';
import AddProject from './screens/AddProject';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
    return (
        <Tab.Navigator

            initialRouteName="Home"
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;
                    let rn = route.name;

                    if (rn === 'Home') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (rn === 'Profile') {
                        iconName = focused ? 'man' : 'man-outline';
                    } else if (rn === 'Calendar') {
                        iconName = focused ? 'calendar' : 'calendar-outline';
                    } else if (rn === 'Note') {
                        iconName = focused ? 'book' : 'book-outline';
                    } else if (rn === 'Project') {
                        iconName = focused ? 'list' : 'list-outline';
                    }
                    return <Ionicons name={iconName} size={size} color={color} />;
                },headerShown: false
            })}
            tabBarOptions={{
                activeTintColor: '#ffad44',
                inactiveTintColor: 'grey',
                labelStyle: { paddingBottom: 10, fontSize: 10 },
                style: { padding: 10, height: 70 },
            }}
        >
            <Tab.Screen name="Home" component={Home} />
            <Tab.Screen name="Calendar" component={Calendar} />
            <Tab.Screen name="Project" component={Project} />
            <Tab.Screen name="Note" component={Note} />
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
