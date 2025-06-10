import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, TextInput, StatusBar, Alert, Image, ScrollView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { getEvents, loginUser, registerForEvent, getRegistrations, cancelRegistration, getProfile, updateProfile } from './api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Load custom fonts
const loadFonts = async () => {
  await Font.loadAsync({
    'Poppins-Regular': require('./assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Bold': require('./assets/fonts/Poppins-Bold.ttf'),
    'Poppins-SemiBold': require('./assets/fonts/Poppins-SemiBold.ttf'),
  });
};

// Event Card Component with Fade-in Animation
function EventCard({ event, index, navigation }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 500, delay: index * 100 });
  }, [opacity, index]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('EventDetails', { event })}
      activeOpacity={0.7}
    >
      <Animated.View style={[styles.eventCard, animatedStyle]}>
        {event.image ? (
          <Image
            source={{ uri: event.image }}
            style={styles.eventImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.eventImagePlaceholder}>
            <Text style={styles.eventImagePlaceholderText}>No Image</Text>
          </View>
        )}
        <View style={styles.eventCardContent}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          
          <View style={styles.detailRow}>
            <Icon name="map-pin" size={16} color="#4A6FFF" style={styles.detailIcon} />
            <Text style={styles.eventDetail}>{event.college}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Icon name="calendar" size={16} color="#4A6FFF" style={styles.detailIcon} />
            <Text style={styles.eventDetail}>
              {new Date(event.date).toLocaleDateString()}
            </Text>
          </View>
          
          <View style={styles.viewDetailsContainer}>
            <Text style={styles.viewDetailsText}>View Details</Text>
            <Icon name="chevron-right" size={16} color="#4A6FFF" />
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

// Home Screen Component
function HomeScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchEvents = async () => {
    try {
      const response = await getEvents();
      setEvents(response.data);
      setFilteredEvents(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch events. Please try again later.');
      setLoading(false);
      console.error(err);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchEvents();
    }, [])
  );

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredEvents(events);
    } else {
      const lowerCaseQuery = query.toLowerCase();
      const filtered = events.filter((event) => {
        const title = event.title.toLowerCase();
        const college = event.college.toLowerCase();
        const date = new Date(event.date).toLocaleDateString().toLowerCase();
        return (
          title.includes(lowerCaseQuery) ||
          college.includes(lowerCaseQuery) ||
          date.includes(lowerCaseQuery)
        );
      });
      setFilteredEvents(filtered);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setFilteredEvents(events);
  };

  const renderEvent = ({ item, index }) => (
    <EventCard event={item} index={index} navigation={navigation} />
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4A6FFF" />
        <Text style={styles.loadingText}>Loading events...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Icon name="alert-circle" size={50} color="#ff4444" />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <View style={styles.headerContainer}>
        <Text style={styles.sectionHeader}>Unisphere Events</Text>
        <Text style={styles.subHeader}>Discover events from colleges around you</Text>
      </View>
      
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#A0A0A0" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search events by title, college, or date"
          placeholderTextColor="#A0A0A0"
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={clearSearch} style={styles.clearIcon}>
            <Icon name="x" size={20} color="#A0A0A0" />
          </TouchableOpacity>
        )}
      </View>
      
      <FlatList
        data={filteredEvents}
        renderItem={renderEvent}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="calendar" size={50} color="#A0A0A0" />
            <Text style={styles.emptyText}>No events found.</Text>
            <Text style={styles.emptySubText}>Try adjusting your search criteria.</Text>
          </View>
        }
      />
    </View>
  );
}

// Login Screen Component
function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await loginUser(email, password);
      const { token } = response.data;
      console.log('Login token:', token);
      await AsyncStorage.setItem('token', token);
      navigation.replace('Main');
    } catch (err) {
      setLoading(false);
      Alert.alert('Error', 'Invalid email or password. Please try again.');
      console.error('Login error:', err);
    }
  };

  return (
    <View style={styles.loginContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.logoContainer}>
        <Icon name="globe" size={60} color="#4A6FFF" />
        <Text style={styles.logoText}>Unisphere</Text>
      </View>
      <Text style={styles.loginHeader}>Welcome Back</Text>
      <Text style={styles.loginSubheader}>Sign in to continue</Text>
      
      <View style={styles.inputContainer}>
        <Icon name="mail" size={20} color="#A0A0A0" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#A0A0A0"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>
      
      <View style={styles.inputContainer}>
        <Icon name="lock" size={20} color="#A0A0A0" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#A0A0A0"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
      
      <TouchableOpacity
        style={styles.loginButton}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('OrganizerRegister')}>
        <Text style={styles.registerLink}>Register as Organizer</Text>
      </TouchableOpacity>
    </View>
  );
}

// Organizer Register Screen Component
function OrganizerRegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [college, setCollege] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('http://192.168.0.100:5000/api/auth/register', {
        name,
        email,
        password,
        college,
        role: 'organizer',
      });
      Alert.alert('Success', 'Organizer account created! Please log in.');
      navigation.navigate('Login');
    } catch (err) {
      setError('Failed to register. Please try again.');
      console.error('Organizer registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.loginContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.logoContainer}>
        <Icon name="globe" size={60} color="#4A6FFF" />
        <Text style={styles.logoText}>Unisphere</Text>
      </View>
      <Text style={styles.loginHeader}>Register as Organizer</Text>
      <Text style={styles.loginSubheader}>Create an account to organize events</Text>

      <View style={styles.inputContainer}>
        <Icon name="user" size={20} color="#A0A0A0" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Name"
          placeholderTextColor="#A0A0A0"
          value={name}
          onChangeText={setName}
        />
      </View>

      <View style={styles.inputContainer}>
        <Icon name="mail" size={20} color="#A0A0A0" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#A0A0A0"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <Icon name="lock" size={20} color="#A0A0A0" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#A0A0A0"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      <View style={styles.inputContainer}>
        <Icon name="map-pin" size={20} color="#A0A0A0" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="College"
          placeholderTextColor="#A0A0A0"
          value={college}
          onChangeText={setCollege}
        />
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={styles.loginButton}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Register</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.registerLink}>Already have an account? Log in</Text>
      </TouchableOpacity>
    </View>
  );
}

// Event Details Screen Component
function EventDetailsScreen({ route, navigation }) {
  const { event } = route.params;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const scale = useSharedValue(1);

  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    scale.value = withTiming(0.95, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 100 });
  };

  const handleRegister = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setError('Please log in to register for an event.');
        setLoading(false);
        return;
      }
      await registerForEvent(event._id, token);
      Alert.alert('Success', 'Registration successful!');
      navigation.goBack();
    } catch (err) {
      setError('Failed to register for the event. Please try again.');
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.detailsContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#4A6FFF" />
      <View style={styles.detailsContent}>
        {event.image ? (
          <Image
            source={{ uri: event.image }}
            style={styles.eventDetailImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.eventDetailImagePlaceholder}>
            <Text style={styles.eventImagePlaceholderText}>No Image</Text>
          </View>
        )}
        <Text style={styles.eventTitleLarge}>{event.title}</Text>
        
        <View style={styles.detailRow}>
          <Icon name="calendar" size={18} color="#4A6FFF" style={styles.detailIcon} />
          <Text style={styles.eventDetail}>
            {new Date(event.date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Icon name="map-pin" size={18} color="#4A6FFF" style={styles.detailIcon} />
          <Text style={styles.eventDetail}>{event.college}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Icon name="tag" size={18} color="#4A6FFF" style={styles.detailIcon} />
          <Text style={styles.eventDetail}>{event.type}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Icon name="credit-card" size={18} color="#4A6FFF" style={styles.detailIcon} />
          <Text style={styles.eventDetail}>₹{event.registrationFee}</Text>
        </View>
        
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionTitle}>About Event</Text>
          <Text style={styles.descriptionText}>{event.description}</Text>
        </View>
        
        {error && <Text style={styles.errorText}>{error}</Text>}
        
        <Animated.View style={[styles.registerButton, animatedButtonStyle]}>
          <TouchableOpacity
            onPress={handleRegister}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="check-circle" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Register for Event</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

// My Registrations Screen Component
function MyRegistrationsScreen({ navigation }) {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setError('Please log in to view your registrations.');
        setLoading(false);
        return;
      }
      const response = await getRegistrations(token);
      setRegistrations(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch registrations. Please try again later.');
      setLoading(false);
      console.error('Fetch registrations error:', err);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchRegistrations();
    }, [])
  );

  const handleCancelRegistration = (registrationId) => {
    Alert.alert(
      'Cancel Registration',
      'Are you sure you want to cancel this registration?',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              if (!token) {
                setError('Please log in to cancel a registration.');
                return;
              }
              await cancelRegistration(registrationId, token);
              Alert.alert('Success', 'Registration cancelled successfully!');
              fetchRegistrations();
            } catch (err) {
              Alert.alert('Error', 'Failed to cancel registration. Please try again.');
              console.error('Cancel registration error:', err);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch(status.toLowerCase()) {
      case 'paid':
        return '#28a745';
      case 'pending':
        return '#ffc107';
      default:
        return '#6c757d';
    }
  };

  const renderRegistration = ({ item }) => {
    if (!item.eventId) {
      return (
        <View style={styles.registrationCard}>
          <View style={styles.registrationContent}>
            <Text style={styles.eventTitle}>Event Not Found</Text>
            <Text style={styles.eventDetail}>This event has been deleted.</Text>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelRegistration(item._id)}
            >
              <Icon name="x-circle" size={16} color="#fff" style={{ marginRight: 5 }} />
              <Text style={styles.buttonTextSmall}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.registrationCard}>
        <View style={styles.registrationContent}>
          <Text style={styles.eventTitle}>{item.eventId.title}</Text>
          
          <View style={styles.detailRow}>
            <Icon name="map-pin" size={16} color="#4A6FFF" style={styles.detailIcon} />
            <Text style={styles.eventDetail}>{item.eventId.college}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Icon name="calendar" size={16} color="#4A6FFF" style={styles.detailIcon} />
            <Text style={styles.eventDetail}>
              {new Date(item.eventId.date).toLocaleDateString()}
            </Text>
          </View>
          
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.paymentStatus) }]}>
              <Text style={styles.statusText}>{item.paymentStatus}</Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => handleCancelRegistration(item._id)}
          >
            <Icon name="x-circle" size={16} color="#fff" style={{ marginRight: 5 }} />
            <Text style={styles.buttonTextSmall}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4A6FFF" />
        <Text style={styles.loadingText}>Loading registrations...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Icon name="alert-circle" size={50} color="#ff4444" />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <View style={styles.headerContainer}>
        <Text style={styles.sectionHeader}>My Registrations</Text>
        <Text style={styles.subHeader}>Manage your event registrations</Text>
      </View>
      
      <FlatList
        data={registrations}
        renderItem={renderRegistration}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="calendar" size={50} color="#A0A0A0" />
            <Text style={styles.emptyText}>No registrations found.</Text>
            <Text style={styles.emptySubText}>Register for events to see them here.</Text>
          </View>
        }
      />
    </View>
  );
}

// Add Event Screen Component
function AddEventScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [college, setCollege] = useState('');
  const [type, setType] = useState('technical');
  const [registrationFee, setRegistrationFee] = useState('');
  const [image, setImage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permission Denied', 'Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const handleCreateEvent = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setError('Please log in to create an event.');
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('date', date.toISOString());
      formData.append('college', college);
      formData.append('type', type);
      formData.append('registrationFee', registrationFee);

      if (image) {
        formData.append('image', {
          uri: image.uri,
          type: 'image/jpeg',
          name: 'event-image.jpg',
        });
      }

      const response = await axios.post('http://192.168.0.100:5000/api/events', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert('Success', 'Event created successfully!');
      navigation.navigate('Home');
    } catch (err) {
      setError('Failed to create event. Please try again.');
      console.error('Create event error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <View style={styles.headerContainer}>
        <Text style={styles.sectionHeader}>Create Event</Text>
        <Text style={styles.subHeader}>Add a new event for students to join</Text>
      </View>

      <ScrollView contentContainerStyle={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Icon name="edit" size={20} color="#A0A0A0" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Event Title"
            placeholderTextColor="#A0A0A0"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.inputContainer}>
          <Icon name="file-text" size={20} color="#A0A0A0" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Description"
            placeholderTextColor="#A0A0A0"
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        <TouchableOpacity
          style={styles.inputContainer}
          onPress={() => setShowDatePicker(true)}
        >
          <Icon name="calendar" size={20} color="#A0A0A0" style={styles.inputIcon} />
          <Text style={styles.dateInput}>
            {date.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setDate(selectedDate);
              }
            }}
          />
        )}

        <View style={styles.inputContainer}>
          <Icon name="map-pin" size={20} color="#A0A0A0" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="College"
            placeholderTextColor="#A0A0A0"
            value={college}
            onChangeText={setCollege}
          />
        </View>

        <View style={styles.inputContainer}>
          <Icon name="tag" size={20} color="#A0A0A0" style={styles.inputIcon} />
          <Picker
            selectedValue={type}
            style={styles.picker}
            onValueChange={(itemValue) => setType(itemValue)}
          >
            <Picker.Item label="Technical" value="technical" />
            <Picker.Item label="Cultural" value="cultural" />
            <Picker.Item label="Sports" value="sports" />
            <Picker.Item label="Other" value="other" />
          </Picker>
        </View>

        <View style={styles.inputContainer}>
          <Icon name="credit-card" size={20} color="#A0A0A0" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Registration Fee"
            placeholderTextColor="#A0A0A0"
            value={registrationFee}
            onChangeText={setRegistrationFee}
            keyboardType="numeric"
          />
        </View>

        <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
          <Icon name="image" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>Pick an Image</Text>
        </TouchableOpacity>

        {image && (
          <Image
            source={{ uri: image.uri }}
            style={styles.previewImage}
            resizeMode="cover"
          />
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={styles.createEventButton}
          onPress={handleCreateEvent}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Icon name="plus-circle" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Create Event</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// My Profile Screen Component
function MyProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updateError, setUpdateError] = useState(null);
  const [updateLoading, setUpdateLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          setError('Please log in to view your profile.');
          setLoading(false);
          return;
        }
        const response = await getProfile(token);
        setProfile(response.data);
        setName(response.data.name);
        setRollNo(response.data.rollNo || '');
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch profile. Please try again later.');
        setLoading(false);
        console.error('Fetch profile error:', err);
      }
    };

    fetchProfile();
  }, []);

  const handleUpdateProfile = async () => {
    setUpdateLoading(true);
    setUpdateError(null);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setUpdateError('Please log in to update your profile.');
        setUpdateLoading(false);
        return;
      }
      const response = await updateProfile({ name, rollNo }, token);
      setProfile(response.data.user);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (err) {
      setUpdateError('Failed to update profile. Please try again.');
      console.error('Update profile error:', err);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (err) {
      Alert.alert('Error', 'Failed to log out. Please try again.');
      console.error('Logout error:', err);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4A6FFF" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Icon name="alert-circle" size={50} color="#ff4444" />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{profile.name ? profile.name.charAt(0).toUpperCase() : '?'}</Text>
        </View>
        <Text style={styles.profileName}>{profile.name || 'User'}</Text>
      </View>
      
      <View style={styles.profileCard}>
        <View style={styles.profileSection}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          
          <View style={styles.profileRow}>
            <Icon name="mail" size={18} color="#4A6FFF" style={styles.profileIcon} />
            <Text style={styles.profileLabel}>Email:</Text>
            <Text style={styles.profileValue}>{profile.email}</Text>
          </View>
          
          <View style={styles.profileRow}>
            <Icon name="map-pin" size={18} color="#4A6FFF" style={styles.profileIcon} />
            <Text style={styles.profileLabel}>College:</Text>
            <Text style={styles.profileValue}>{profile.college}</Text>
          </View>
        </View>
        
        <View style={styles.profileSection}>
          <Text style={styles.sectionTitle}>Edit Profile</Text>
          
          <View style={styles.inputContainerProfile}>
            <Icon name="user" size={18} color="#A0A0A0" style={styles.inputIcon} />
            <TextInput
              style={styles.profileInput}
              placeholder="Name"
              placeholderTextColor="#A0A0A0"
              value={name}
              onChangeText={setName}
            />
          </View>
          
          <View style={styles.inputContainerProfile}>
            <Icon name="hash" size={18} color="#A0A0A0" style={styles.inputIcon} />
            <TextInput
              style={styles.profileInput}
              placeholder="Roll Number"
              placeholderTextColor="#A0A0A0"
              value={rollNo}
              onChangeText={setRollNo}
            />
          </View>
          
          {updateError && <Text style={styles.errorText}>{updateError}</Text>}
          
          <TouchableOpacity
            style={styles.updateButton}
            onPress={handleUpdateProfile}
            disabled={updateLoading}
          >
            {updateLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="check-circle" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Update Profile</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="log-out" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Main Tabs Component
function MainTabs() {
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          const response = await axios.get('http://192.168.0.100:5000/api/users/profile', {
            headers: { Authorization: `Bearer ${token}` },
          });
          setUserRole(response.data.role);
        }
      } catch (err) {
        console.error('Fetch user role error:', err);
      }
    };
    fetchUserRole();
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home';
          } else if (route.name === 'MyRegistrations') {
            iconName = focused ? 'calendar' : 'calendar';
          } else if (route.name === 'AddEvent') {
            iconName = focused ? 'plus-circle' : 'plus-circle';
          } else if (route.name === 'MyProfile') {
            iconName = focused ? 'user' : 'user';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4A6FFF',
        tabBarInactiveTintColor: '#A0A0A0',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 0,
          elevation: 0,
          paddingBottom: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontFamily: 'Poppins-Regular',
          fontSize: 12,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="MyRegistrations"
        component={MyRegistrationsScreen}
        options={{ title: 'My Registrations', headerShown: false }}
      />
      {userRole === 'organizer' && (
        <Tab.Screen
          name="AddEvent"
          component={AddEventScreen}
          options={{ title: 'Add Event', headerShown: false }}
        />
      )}
      <Tab.Screen
        name="MyProfile"
        component={MyProfileScreen}
        options={{ title: 'My Profile', headerShown: false }}
      />
    </Tab.Navigator>
  );
}

// Main App Component
export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await loadFonts();
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <NavigationContainer onReady={onLayoutRootView}>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="OrganizerRegister"
          component={OrganizerRegisterScreen}
          options={{ title: 'Register as Organizer' }}
        />
        <Stack.Screen
          name="Main"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="EventDetails"
          component={EventDetailsScreen}
          options={{ title: 'Event Details', headerBackTitle: 'Back' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  headerContainer: {
    marginTop: 40,
    marginBottom: 15,
  },
  sectionHeader: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#212529',
  },
  subHeader: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#6c757d',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    height: 45,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#212529',
    paddingVertical: 8,
  },
  clearIcon: {
    padding: 5,
  },
  listContainer: {
    paddingBottom: 20,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: 180,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  eventImagePlaceholder: {
    width: '200%',
    height: 180,
    backgroundColor: '#f1f3f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  eventImagePlaceholderText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#A0A0A0',
  },
  eventCardContent: {
    padding: 15,
  },
  eventTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#212529',
    marginBottom: 5,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  detailIcon: {
    marginRight: 8,
  },
  eventDetail: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#6c757d',
  },
  viewDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  viewDetailsText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#4A6FFF',
    marginRight: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#212529',
    marginTop: 10,
  },
  emptySubText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#6c757d',
    marginTop: 5,
  },
  loadingText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#6c757d',
    marginTop: 10,
  },
  loginContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 28,
    color: '#4A6FFF',
    marginTop: 10,
  },
  loginHeader: {
    fontFamily: 'Poppins-Bold',
    fontSize: 28,
    color: '#212529',
    textAlign: 'center',
  },
  loginSubheader: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#212529',
    paddingVertical: 12,
  },
  loginButton: {
    backgroundColor: '#4A6FFF',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#fff',
  },
  registerLink: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#4A6FFF',
    textAlign: 'center',
    marginTop: 20,
  },
  errorText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#ff4444',
    textAlign: 'center',
    marginBottom: 15,
  },
  detailsContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  detailsContent: {
    padding: 20,
  },
  eventDetailImage: {
    width: '100%',
    height: 200,
    borderRadius: 15,
    marginBottom: 15,
  },
  eventDetailImagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#f1f3f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    marginBottom: 15,
  },
  eventTitleLarge: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#212529',
    marginBottom: 15,
  },
  descriptionContainer: {
    marginVertical: 15,
  },
  descriptionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#212529',
    marginBottom: 5,
  },
  descriptionText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 22,
  },
  registerButton: {
    backgroundColor: '#4A6FFF',
    paddingVertical: 15,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  registrationCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  registrationContent: {
    padding: 15,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  statusBadge: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  statusText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#fff',
  },
  cancelButton: {
    backgroundColor: '#ff4444',
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonTextSmall: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#fff',
  },
  profileHeader: {
    alignItems: 'center',
    marginTop: 40, // Reduced from 50 to push everything up
    marginBottom: 20,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4A6FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 32,
    color: '#fff',
  },
  profileName: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#212529',
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  profileSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#212529',
    marginBottom: 10,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  profileIcon: {
    marginRight: 10,
  },
  profileLabel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#212529',
    width: 80,
  },
  profileValue: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#6c757d',
    flex: 1,
  },
  inputContainerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  profileInput: {
    flex: 1,
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#212529',
    paddingVertical: 12,
  },
  updateButton: {
    backgroundColor: '#4A6FFF',
    paddingVertical: 15,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  logoutButton: {
    backgroundColor: '#ff4444',
    paddingVertical: 15,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  formContainer: {
    paddingBottom: 20,
  },
  dateInput: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#212529',
    paddingVertical: 12,
    flex: 1,
  },
  picker: {
    flex: 1,
    height: 50,
    color: '#212529',
  },
  imagePickerButton: {
    backgroundColor: '#4A6FFF',
    paddingVertical: 15,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  previewImage: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    marginVertical: 10,
  },
  createEventButton: {
    backgroundColor: '#4A6FFF',
    paddingVertical: 15,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
}); 