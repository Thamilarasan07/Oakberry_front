import React, { useEffect, useRef, useState } from "react";
import "./chat.css";
import { io } from "socket.io-client";
import { useParams } from "react-router-dom";
import moment from "moment-timezone";

function Chatbox() {
	const { userid, receiverid } = useParams();
	const [users, setUsers] = useState([]); // List of connected users
	const [activeChat, setActiveChat] = useState(receiverid ?? null); // Active chat user
	const [message, setMessage] = useState(""); // Holds the input message
	const [newuser, setnewuser] = useState(null);
	const [chat, setChat] = useState([]);
	const socket = useRef(null); // Socket instance
	useEffect(() => {
		console.log("running once");
		const fetchUsers = async () => {
			try {
				const response = await fetch(
					`http://localhost:5555/api/chat/user/${userid}`
				);
				const data = await response.json();
				setUsers(data); // Set the list of users
			} catch (error) {
				console.error("Error fetching users:", error);
			}
		};
		fetchUsers();
	}, [newuser]);
	// Initialize socket connection and set up event listeners
	useEffect(() => {
		if (activeChat) {
			// Disconnect the previous socket connection
			if (socket.current) {
				socket.current.disconnect();
			}

			// Connect to Socket.IO with the selected chat partner
			socket.current = io(
				`http://localhost:5555/?userid=${userid}&receiverid=${activeChat}`
			);

			// Emit the joinRoom event
			socket.current.emit("joinRoom");

			// Load messages for the room
			socket.current.on("loadMessages", (messages) => {
				setChat(messages); // Update chat state
			});

			// Listen for new messages
			socket.current.on("newMessage", (data) => {
				console.log("New message received:", data);
				if (data.senderId !== userid) {
					setChat((prevChat) => [
						...prevChat,
						{
							message: data.message,
							senderId: data.senderId,
							timestamp: data.timestamp,
						},
					]);
				}
			});

			// Cleanup on unmount
			return () => {
				if (socket.current) {
					socket.current.disconnect();
					console.log("Socket disconnected");
				}
			};
		}
	}, [activeChat, userid]);

	// Function to send a message to the server
	const sendMessage = () => {
		console.log(activeChat);
		if (activeChat && !users.some((user) => user.userId === activeChat)) {
			setnewuser(activeChat); // Update `newuser`
		}
		if (message.trim() && socket.current) {
			socket.current.emit("message", message); // Send the message to the server
			setChat((prevChat) => [
				...prevChat,
				{ message, senderId: userid, timestamp: new Date() }, // Add the message locally
			]);
			setUsers((prevUsers) =>
				prevUsers.map((user) =>
					user.userId === activeChat
						? { ...user, lastMessage: message, updatedAt: new Date() }
						: user
				)
			);
			setMessage(""); // Clear the input field
		}
	};

	// Function to handle pressing Enter key to send a message
	const send = (e) => {
		if (e.key === "Enter") {
			e.preventDefault();
			sendMessage();
		}
	};

	return (
		<div style={{ backgroundColor: "rgb(8, 8, 43)" }} className="parent_chat">
			<h3>
				CHAT <i className="fa-light fa-comment-dots fa-sm"></i>
			</h3>
			<div style={{ display: "flex", padding: "0 3rem", gap: "5px" }}>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "3px",
						width: "25%",
						border: "2px solid #ccc",
						borderRadius: "20px 10px",
						padding: "6px 4px",
					}}>
					{users.map((user) => (
						<div
							className="chat_person"
							key={user.userId}
							onClick={() => setActiveChat(user.userId)}>
							<img
								style={{
									height: "50px",
									width: "50px",
									borderRadius: "50%",
									objectFit: "cover",
									objectPosition: "top center",
								}}
								src={user.profile}
								alt="Empty"></img>
							<div style={{ width: "80%" }}>
								<p style={{ margin: "0 0 0 5px",fontSize:"14px" }}>{user.name}</p>
								<div style={{ display: "flex" }}>
									<p
										style={{
											margin: "0 0 0 5px",
											color:"#777",
											width: "80%",
											fontSize: "13px",
											whiteSpace: "nowrap",
											overflow: "hidden",
											textOverflow: "ellipsis",
										}}>
										{user.lastMessage}
									</p>
									<p
										style={{
											margin: "0 0 0 5px",
											fontSize: "10px",
											alignSelf: "flex-end",
											justifySelf: "flex-end",
											width: "20%",
										}}>
										{moment(user.updatedAt).tz("Asia/Kolkata").format("h:mm A")}
									</p>
								</div>
							</div>
						</div>
					))}
				</div>
				<div
					style={{
						width: "75%",
						border: "2px solid #ccc",
						borderRadius: "20px 10px",
						backgroundColor: "#85929e",
					}}>
					<div
						style={{
							padding: "10px",
							height: "65vh",
							overflowY: "scroll",
							display: "flex",
							flexDirection: "column",
						}}>
						{/* Loop through the chat history and display each message */}
						{chat.map((msg, index) => (
							<p
								className={msg.senderId === userid ? "client" : "server"}
								key={index}>
								{msg.senderId === userid ? "Client: " : "Server: "}
								{msg.message}
							</p>
						))}
					</div>
					<div
						style={{
							display: "flex",
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "center",
							backgroundColor: "white",
							borderRadius: "50px",
							padding: "0 10px",
							margin: "1% 8%",
						}}>
						<input
							className="text"
							type="text"
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							placeholder="Type your message..."
							onKeyDown={send}
						/>
						<button className="sendmessage" onClick={sendMessage}>
							<i className="fa-sharp-duotone fa-solid fa-paper-plane"></i>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default Chatbox;
