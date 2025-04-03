#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print with color
print_message() {
    echo -e "${2}${1}${NC}"
}

# Check if MongoDB is running
check_mongodb() {
    print_message "Checking MongoDB status..." "$YELLOW"
    if mongod --version >/dev/null 2>&1; then
        if pgrep -x "mongod" >/dev/null; then
            print_message "MongoDB is running" "$GREEN"
            return 0
        else
            print_message "MongoDB is installed but not running" "$RED"
            print_message "Please start MongoDB before continuing" "$YELLOW"
            return 1
        fi
    else
        print_message "MongoDB is not installed" "$RED"
        print_message "Please install MongoDB before continuing" "$YELLOW"
        print_message "Visit: https://docs.mongodb.com/manual/installation/" "$YELLOW"
        return 1
    fi
}

# Check if Node.js is installed
check_node() {
    print_message "Checking Node.js version..." "$YELLOW"
    if ! command -v node >/dev/null 2>&1; then
        print_message "Node.js is not installed" "$RED"
        print_message "Please install Node.js before continuing" "$YELLOW"
        print_message "Visit: https://nodejs.org/" "$YELLOW"
        return 1
    fi

    local node_version=$(node -v | cut -d. -f1 | tr -d 'v')
    if [ "$node_version" -lt 14 ]; then
        print_message "Node.js version must be 14 or higher" "$RED"
        print_message "Current version: $(node -v)" "$YELLOW"
        return 1
    fi
    
    print_message "Node.js version $(node -v) is compatible" "$GREEN"
    return 0
}

# Main setup function
main() {
    print_message "Starting setup for SLLS Legal Clinic System..." "$YELLOW"
    
    # Check prerequisites
    check_node || exit 1
    check_mongodb || exit 1

    # Create .env file if it doesn't exist
    if [ ! -f "src/backend/.env" ]; then
        print_message "Creating .env file..." "$YELLOW"
        cp src/backend/.env.example src/backend/.env
        print_message "Created .env file from example" "$GREEN"
        print_message "Please update the .env file with your configuration" "$YELLOW"
    fi

    # Install dependencies
    print_message "Installing dependencies..." "$YELLOW"
    npm run install:all

    if [ $? -eq 0 ]; then
        print_message "Dependencies installed successfully" "$GREEN"
    else
        print_message "Error installing dependencies" "$RED"
        exit 1
    fi

    # Ask if user wants to seed the database
    read -p "Do you want to seed the database with sample data? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_message "Seeding database..." "$YELLOW"
        npm run seed
        if [ $? -eq 0 ]; then
            print_message "Database seeded successfully" "$GREEN"
        else
            print_message "Error seeding database" "$RED"
            exit 1
        fi
    fi

    print_message "\nSetup completed successfully!" "$GREEN"
    print_message "\nTo start the application in development mode:" "$YELLOW"
    print_message "npm run dev" "$NC"
    print_message "\nThe application will be available at:" "$YELLOW"
    print_message "Frontend: http://localhost:3000" "$NC"
    print_message "Backend API: http://localhost:5000" "$NC"
}

# Run main setup
main