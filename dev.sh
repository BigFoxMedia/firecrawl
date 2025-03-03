#!/bin/bash

# SCRIPT COMMANDS:
# ./dev.sh -s            # Start tmux session and all services
# ./dev.sh -s -t api     # Start only the API service in tmux
# ./dev.sh -w            # Attach to tmux session
# ./dev.sh -e            # Stop the tmux session
# ./dev.sh               # Display help message

# TMUX GUIDES:
# https://github.com/tmux/tmux/wiki/Getting-Started
# https://tmuxcheatsheet.com/

# TMUX COMMANDS:
# tmux new-session -d -s <session-name> # Create a new session
# tmux attach -t <session-name>         # Attach to a session
# tmux kill-session -t <session-name>   # Kill a session
# tmux list-sessions                    # List all sessions
# tmux ls                               # List all sessions
# tmux rename-session -t <old-name> <new-name> # Rename a session
# tmux switch -t <session-name>         # Switch to a session
# tmux split-window -h                  # Split window horizontally
# tmux split-window -v                  # Split window vertically
# tmux select-pane -t <pane-number>     # Select a pane
# tmux kill-pane -t <pane-number>       # Kill a pane
# tmux list-panes                       # List all panes

# TMUX COMMANDS WITHIN TMUX SESSION:
# Ctrl+b %                              # Split window vertically
# Ctrl+b "                              # Split window horizontally
# Ctrl+b <arrow-key>                    # Switch between panes
# Ctrl+b x                              # Kill a pane
# Ctrl+b c                              # Create a new window
# Ctrl+b n                              # Switch to the next window
# Ctrl+b p                              # Switch to the previous window
# Ctrl+b d                              # Detach from the session

# TMUX GUIDES:
# https://github.com/tmux/tmux/wiki/Getting-Started
# https://tmuxcheatsheet.com/

# TMUX COMMANDS:
# Ctrl+b %            # Split window vertically
# Ctrl+b "            # Split window horizontally
# Ctrl+b <arrow-key>  # Switch between panes
# Ctrl+b x            # Kill a pane
# Ctrl+b c            # Create a new window
# Ctrl+b n            # Switch to the next window
# Ctrl+b p            # Switch to the previous window
# Ctrl+b d            # Detach from the session

SESSION_NAME="firecrawl"
SERVICES=("playwright" "workers" "api")

# Initialize options
TARGET=""
WATCH=false
START=false
END=false

# Function to display usage instructions
show_usage() {
	echo "Usage: $0 [-t <service>] [-s] [-w] [-e]"
	echo ""
	echo "Options:"
	echo "  -t <service>   Specify a service (playwright, workers, api)"
	echo "  -s             Start a new tmux session with multiple panes"
	echo "  -w             Attach to the tmux session"
	echo "  -e             Kill the tmux session"
	echo ""
	echo "Examples:"
	echo "  $0 -s            # Start tmux session and all services"
	echo "  $0 -s -t api     # Start only the API service in tmux"
	echo "  $0 -w            # Attach to tmux session"
	echo "  $0 -e            # Stop the tmux session"
	exit 1
}

# Parse options
while getopts "t:wse" opt; do
	case $opt in
		t) TARGET=$OPTARG ;;
		w) WATCH=true ;;
		s) START=true ;;
		e) END=true ;;
		*)
			echo "Invalid option."
			show_usage
			;;
	esac
done

# If no options are provided, display help message
if [ "$#" -eq 0 ]; then
	echo "No options provided."
	show_usage
fi

# Function to start the tmux session with multiple panes
start_tmux_session() {
	# Kill existing session if it already exists
	tmux kill-session -t "$SESSION_NAME" 2>/dev/null

	echo "Starting tmux session: $SESSION_NAME"

	# Create new session for Playwright (pane exits automatically)
	tmux new-session -d -s "$SESSION_NAME" -n main \
		"cd ~/firecrawl/apps/playwright-service-ts && docker compose up -d; tmux send-keys -t $SESSION_NAME 'exit' C-m"

	# Create additional panes for the other services
	tmux split-window -h -t "$SESSION_NAME:0" "cd ~/firecrawl/apps/api && pnpm run workers; exec bash"
	tmux split-window -v -t "$SESSION_NAME:0" "cd ~/firecrawl/apps/api && pnpm run start; exec bash"

	# Arrange panes for better visibility
	tmux select-layout -t "$SESSION_NAME:0" tiled

	echo "Tmux session started with all services running in separate panes."
}

# Function to start only a specific service in the tmux session
start_service() {
	local service=$1
	case $service in
		"playwright")
			tmux new-session -d -s "$SESSION_NAME" -n main \
				"cd ~/firecrawl/apps/playwright-service-ts && docker compose up -d; tmux send-keys -t $SESSION_NAME 'exit' C-m"
			;;
		"workers")
			tmux new-window -t "$SESSION_NAME" -n workers "cd ~/firecrawl/apps/api && pnpm run workers; exec bash"
			;;
		"api")
			tmux new-window -t "$SESSION_NAME" -n api "cd ~/firecrawl/apps/api && pnpm run start; exec bash"
			;;
		*)
			echo "Unknown service: $service"
			exit 1
			;;
	esac
	echo "Started $service service in a new tmux pane."
}

# Function to kill the tmux session
end_tmux_session() {
	tmux kill-session -t "$SESSION_NAME" 2>/dev/null && \
		echo "Stopped tmux session: $SESSION_NAME." || \
		echo "No session found."
}

# Main logic

if [ "$END" = true ]; then
	end_tmux_session
	exit 0
fi

if [ "$START" = true ]; then
	if [ -n "$TARGET" ]; then
		start_service "$TARGET"
	else
		start_tmux_session
	fi
fi

if [ "$WATCH" = true ]; then
	tmux attach -t "$SESSION_NAME"
fi

exit 0
