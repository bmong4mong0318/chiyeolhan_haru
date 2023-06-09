import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  AppState,
  ImageBackground,
  StatusBar,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import BackgroundGeolocation from 'react-native-background-geolocation';
import RNRestart from 'react-native-restart';
import * as SplashScreen from 'expo-splash-screen';

import { init, setNetwork, setTabBar, setHomeRender } from 'redux/store';

import HomeContent from 'components/items/HomeContent';
import { HomeHeader } from 'components/items/HomeHeader';
import { Loading } from 'components/screen/LoadingScreen';

import { checkDayChange, loadSuccessSchedules } from 'utils/asyncStorageUtil';
import { dbService } from 'utils/firebaseUtil';
import { getDate } from 'utils/timeUtil';
import DeviceInfo from 'react-native-device-info';

import { UID, CONTAINER_HEIGHT, CONTAINER_WIDTH } from 'constant/const';
const Home = ({ navigation }) => {
  const dispatch = useDispatch();
  const homeRender = useSelector((state) => state.homerender);
  const { YESTERDAY, TODAY } = getDate();
  const [isLoading, setLoading] = useState(true);

  const appState = useRef(AppState.currentState);

  useEffect(() => {
    StatusBar.setBarStyle('dark-content');
    AppState.addEventListener('change', __handleAppStateChange);
    readyForHome();
    return () => {
      AppState.removeEventListener('change', __handleAppStateChange);
    };
  }, []);

  useEffect(() => {
    dispatch(setHomeRender(false));
  }, [homeRender]);

  const __handleAppStateChange = async (nextAppState) => {
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      try {
        await BackgroundGeolocation.requestPermission();
        await loadSuccessSchedules();
        const isDaychange = await checkDayChange();
        if (isDaychange) {
          RNRestart.Restart();
        }
      } catch (e) {
        console.log('requestPermission Deny:', e);
      }
    }
    appState.current = nextAppState;
  };

  const readyForHome = async () => {
    await getToDos();
    await checkDayChange();
    await loadSuccessSchedules();
    await SplashScreen.hideAsync();
  };

  const getToDos = async () => {
    try {
      dispatch(setNetwork('online'));
      dispatch(setTabBar('today'));
      //setLoading(true);

      let rowObj = {};
      let filterObj = {};
      const row = await dbService.collection(`${UID}`).get();
      row.forEach((data) => (rowObj[data.id] = data.data()));
      if (Object.keys(rowObj).length === 0) {
        //데이터가 아무것도 없을때
        setLoading(false);
        return;
      }
      for (key in rowObj) {
        if (rowObj[key].date >= YESTERDAY)
          filterObj = { ...filterObj, [key]: rowObj[key] };
      }
      await dispatch(init(filterObj));

      setLoading(false);
      return;
    } catch (e) {
      console.log('getToDos Error :', e);
    }
  };

  return isLoading || homeRender ? (
    <Loading />
  ) : (
    <>
      <View style={styles.wrap}>
        <View style={styles.homeContainer}>
          <HomeHeader navigation={navigation} />
          <HomeContent />
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ECF5F471',
  },
  homeContainer: {
    flex: 2.25,
    width: CONTAINER_WIDTH,
  },
  homeHeader: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  homeHeaderText: { flex: 0.7, paddingLeft: 15 },

  iconScheduleButton: { marginBottom: 10 },
});

export default Home;
