-- Sample data for testing the expense tracker

-- Insert sample users
INSERT INTO users (id, username, email, password_hash, first_name, last_name) VALUES
(uuid_generate_v4(), 'johndoe', 'john.doe@example.com', '$2a$10$XOY8C2KPxF1KqLdQU6ZC3OY.Vz3I4tT1B2y7WdBN3EqI5u2r6O9dW', 'John', 'Doe'),
(uuid_generate_v4(), 'janesmith', 'jane.smith@example.com', '$2a$10$XOY8C2KPxF1KqLdQU6ZC3OY.Vz3I4tT1B2y7WdBN3EqI5u2r6O9dW', 'Jane', 'Smith');

-- Get user IDs for foreign key references
DO $$
DECLARE
    john_id UUID;
    jane_id UUID;
BEGIN
    SELECT id INTO john_id FROM users WHERE username = 'johndoe';
    SELECT id INTO jane_id FROM users WHERE username = 'janesmith';
    
    -- Insert root categories for John
    INSERT INTO categories (user_id, name, description, color, icon) VALUES
    (john_id, 'Food & Dining', 'Restaurant meals, groceries, and food delivery', '#ef4444', 'utensils'),
    (john_id, 'Transportation', 'Gas, public transit, ride shares, car maintenance', '#3b82f6', 'car'),
    (john_id, 'Entertainment', 'Movies, concerts, games, subscriptions', '#8b5cf6', 'film'),
    (john_id, 'Shopping', 'Clothing, electronics, household items', '#06b6d4', 'shopping-bag'),
    (john_id, 'Bills & Utilities', 'Rent, electricity, internet, phone bills', '#f59e0b', 'receipt'),
    (john_id, 'Health & Fitness', 'Medical expenses, gym, supplements', '#10b981', 'heart'),
    (john_id, 'Education', 'Books, courses, training materials', '#6366f1', 'book'),
    (john_id, 'Travel', 'Flights, hotels, vacation expenses', '#ec4899', 'plane');
    
    -- Insert subcategories for Food & Dining
    INSERT INTO categories (user_id, name, description, parent_id, color, icon) VALUES
    (john_id, 'Restaurants', 'Dining out at restaurants', (SELECT id FROM categories WHERE name = 'Food & Dining' AND user_id = john_id), '#ef4444', 'utensils'),
    (john_id, 'Groceries', 'Grocery shopping and household food items', (SELECT id FROM categories WHERE name = 'Food & Dining' AND user_id = john_id), '#f97316', 'shopping-cart'),
    (john_id, 'Coffee & Snacks', 'Coffee shops, quick snacks', (SELECT id FROM categories WHERE name = 'Food & Dining' AND user_id = john_id), '#a3a3a3', 'coffee');
    
    -- Insert subcategories for Transportation
    INSERT INTO categories (user_id, name, description, parent_id, color, icon) VALUES
    (john_id, 'Gas', 'Fuel for vehicle', (SELECT id FROM categories WHERE name = 'Transportation' AND user_id = john_id), '#3b82f6', 'fuel'),
    (john_id, 'Public Transit', 'Bus, train, subway fares', (SELECT id FROM categories WHERE name = 'Transportation' AND user_id = john_id), '#06b6d4', 'train'),
    (john_id, 'Car Maintenance', 'Oil changes, repairs, car wash', (SELECT id FROM categories WHERE name = 'Transportation' AND user_id = john_id), '#64748b', 'wrench');
    
    -- Insert sample expenses for John (last 3 months)
    INSERT INTO expenses (user_id, category_id, amount, description, expense_date, payment_method, tags) VALUES
    -- January 2024 expenses
    (john_id, (SELECT id FROM categories WHERE name = 'Restaurants' AND user_id = john_id), 45.50, 'Dinner at Italian restaurant', '2024-01-15', 'credit_card', ARRAY['dinner', 'italian']),
    (john_id, (SELECT id FROM categories WHERE name = 'Groceries' AND user_id = john_id), 120.75, 'Weekly grocery shopping', '2024-01-16', 'debit_card', ARRAY['weekly', 'groceries']),
    (john_id, (SELECT id FROM categories WHERE name = 'Gas' AND user_id = john_id), 55.00, 'Gas station fill-up', '2024-01-18', 'credit_card', ARRAY['fuel']),
    (john_id, (SELECT id FROM categories WHERE name = 'Coffee & Snacks' AND user_id = john_id), 8.50, 'Morning coffee and pastry', '2024-01-20', 'cash', ARRAY['coffee', 'breakfast']),
    (john_id, (SELECT id FROM categories WHERE name = 'Entertainment' AND user_id = john_id), 15.99, 'Netflix monthly subscription', '2024-01-25', 'credit_card', ARRAY['streaming', 'subscription']),
    
    -- February 2024 expenses
    (john_id, (SELECT id FROM categories WHERE name = 'Restaurants' AND user_id = john_id), 32.25, 'Lunch at burger place', '2024-02-03', 'credit_card', ARRAY['lunch', 'burger']),
    (john_id, (SELECT id FROM categories WHERE name = 'Groceries' AND user_id = john_id), 98.40, 'Grocery shopping', '2024-02-05', 'debit_card', ARRAY['groceries']),
    (john_id, (SELECT id FROM categories WHERE name = 'Public Transit' AND user_id = john_id), 25.00, 'Monthly metro card', '2024-02-01', 'debit_card', ARRAY['monthly', 'transit']),
    (john_id, (SELECT id FROM categories WHERE name = 'Health & Fitness' AND user_id = john_id), 50.00, 'Gym membership monthly fee', '2024-02-10', 'credit_card', ARRAY['gym', 'monthly']),
    (john_id, (SELECT id FROM categories WHERE name = 'Shopping' AND user_id = john_id), 89.99, 'Winter jacket purchase', '2024-02-12', 'credit_card', ARRAY['clothing', 'winter']),
    
    -- March 2024 expenses
    (john_id, (SELECT id FROM categories WHERE name = 'Restaurants' AND user_id = john_id), 67.80, 'Weekend dinner with friends', '2024-03-08', 'credit_card', ARRAY['dinner', 'friends']),
    (john_id, (SELECT id FROM categories WHERE name = 'Groceries' AND user_id = john_id), 145.20, 'Bulk grocery shopping', '2024-03-10', 'debit_card', ARRAY['bulk', 'groceries']),
    (john_id, (SELECT id FROM categories WHERE name = 'Car Maintenance' AND user_id = john_id), 75.00, 'Oil change and inspection', '2024-03-15', 'debit_card', ARRAY['maintenance', 'oil']),
    (john_id, (SELECT id FROM categories WHERE name = 'Entertainment' AND user_id = john_id), 28.00, 'Movie tickets for two', '2024-03-22', 'credit_card', ARRAY['movie', 'date']),
    (john_id, (SELECT id FROM categories WHERE name = 'Bills & Utilities' AND user_id = john_id), 125.50, 'Electricity bill', '2024-03-25', 'bank_transfer', ARRAY['utility', 'electricity']);
    
    -- Insert sample budgets for John
    INSERT INTO budgets (user_id, category_id, amount, period_type, start_date, end_date) VALUES
    (john_id, (SELECT id FROM categories WHERE name = 'Food & Dining' AND user_id = john_id), 500.00, 'monthly', '2024-01-01', '2024-12-31'),
    (john_id, (SELECT id FROM categories WHERE name = 'Transportation' AND user_id = john_id), 200.00, 'monthly', '2024-01-01', '2024-12-31'),
    (john_id, (SELECT id FROM categories WHERE name = 'Entertainment' AND user_id = john_id), 100.00, 'monthly', '2024-01-01', '2024-12-31');
END $$;