// src/App.js
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import firebase, { auth, firestore } from './firebase';
import './App.css';

function App() {
  // — USER & CHAT STATE —
  const [name, setName] = useState('');
  const [role, setRole] = useState('rower');
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const messagesEndRef = useRef();

  // — WEATHER & TIDE STATE —
  const [weather, setWeather] = useState({ briones: null, oakland: null });
  const [tide, setTide] = useState(null);

  // Scroll chat on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch data on mount
  useEffect(() => {
    fetchWeather();
    fetchTide();
    const unsubscribe = firestore
      .collection('messages')
      .orderBy('createdAt')
      .onSnapshot(snap =>
        setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      );
    return unsubscribe;
  }, []);

  // — API CALLS —
  const fetchWeather = async () => {
    const key = process.env.REACT_APP_WEATHER_API_KEY;
    try {
      const [bRes, oRes] = await Promise.all([
        axios.get('https://api.openweathermap.org/data/3.0/onecall', {
          params: {
            lat: 37.9156,
            lon: -122.1684,
            units: 'imperial',
            exclude: 'minutely,daily,alerts',
            appid: key,
          },
        }),
        axios.get('https://api.openweathermap.org/data/3.0/onecall', {
          params: {
            lat: 37.7916,
            lon: -122.2450,
            units: 'imperial',
            exclude: 'minutely,daily,alerts',
            appid: key,
          },
        }),
      ]);
      setWeather({ briones: bRes.data, oakland: oRes.data });
    } catch (err) {
      console.error('Weather fetch error', err);
    }
  };

  const fetchTide = async () => {
    const key = process.env.REACT_APP_TIDE_API_KEY;
    try {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const res = await axios.get(
        'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter',
        {
          params: {
            station: '9414750',
            product: 'predictions',
            application: 'DBConnection',
            begin_date: today,
            end_date: today,
            datum: 'MLLW',
            interval: 'h',
            units: 'english',
            time_zone: 'lst_ldt',
            format: 'json',
            key,
          },
        }
      );
      setTide(res.data.predictions[0]);
    } catch (err) {
      console.error('Tide fetch error', err);
    }
  };

  // — CHAT HANDLERS —
  const sendMessage = async () => {
    if (!name.trim() || !newMsg.trim()) return;
    await firestore.collection('messages').add({
      text: newMsg,
      name,
      role,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    setNewMsg('');
  };

  return (
    <div className="app">
      <h1>DBConnection</h1>

      {/* WEATHER (side-by-side) */}
      {weather.briones && (
        <section className="section weather-section">
          <div className="weather-card">
            <h2>Briones Reservoir</h2>
            <p className="weather-desc">
              {weather.briones.current.weather[0].description}
            </p>
            <p className="weather-temp">
              {Math.round(weather.briones.current.temp)}°F
            </p>
          </div>
          <div className="weather-card">
            <h2>Oakland Estuary</h2>
            <p className="weather-desc">
              {weather.oakland.current.weather[0].description}
            </p>
            <p className="weather-temp">
              {Math.round(weather.oakland.current.temp)}°F
            </p>
          </div>
        </section>
      )}

      {/* HOURLY FORECAST (Briones) */}
      {weather.briones && (
        <section className="section hourly">
          <h2>Next 12 Hours (Briones)</h2>
          <div className="hourly-grid">
            {weather.briones.hourly.slice(0, 12).map(hour => (
              <div key={hour.dt} className="hour-card">
                <div className="hour-time">
                  {new Date(hour.dt * 1000).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div className="hour-temp">{Math.round(hour.temp)}°F</div>
                <div className="hour-wind">
                  Wind {Math.round(hour.wind_speed)} mph
                </div>
                <div className="hour-pop">
                  Precip {Math.round(hour.pop * 100)}%
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* HOURLY FORECAST (Oakland) */}
      {weather.oakland && (
        <section className="section hourly">
          <h2>Next 12 Hours (Oakland Estuary)</h2>
          <div className="hourly-grid">
            {weather.oakland.hourly.slice(0, 12).map(hour => (
              <div key={hour.dt} className="hour-card">
                <div className="hour-time">
                  {new Date(hour.dt * 1000).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div className="hour-temp">{Math.round(hour.temp)}°F</div>
                <div className="hour-wind">
                  Wind {Math.round(hour.wind_speed)} mph
                </div>
                <div className="hour-pop">
                  Precip {Math.round(hour.pop * 100)}%
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TIDE */}
      <section className="section tide">
        <h2>Tide</h2>
        {tide ? (
          <div className="tide-card">
            Tide — {tide.v} ft going out
          </div>
        ) : (
          <div>Loading tide data…</div>
        )}
      </section>

      {/* CHAT */}
      <section className="section chat">
        <h2>Team Chat</h2>
        <div className="chat-header">
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <select value={role} onChange={e => setRole(e.target.value)}>
            <option value="rower">Rower</option>
            <option value="coxswain">Coxswain</option>
            <option value="coach">Coach</option>
            <option value="dave">Dave</option>
          </select>
        </div>
        <div className="messages">
          {messages.map(msg => (
            <div key={msg.id} className="message">
              <span className="meta">
                [{msg.createdAt?.toDate().toLocaleTimeString()}]{' '}
                {msg.role}/{msg.name}:
              </span>{' '}
              {msg.text}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="chat-input">
          <input
            type="text"
            placeholder="Type a message…"
            value={newMsg}
            onChange={e => setNewMsg(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && sendMessage()}
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      </section>
    </div>
  );
}

export default App;
