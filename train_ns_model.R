# Load required libraries
library(tidymodels)
library(arrow)

# Load the data
train <- 
  read_feather("https://figshare.com/ndownloader/files/45407401") |> 
  select(contam_comment, bun:sodium) |> 
  mutate(contam_comment = factor(contam_comment))

# Define the feature recipe
recipe <- recipe(contam_comment ~ ., data = train)

# Define the model
model <- boost_tree(mode = "classification") |> set_engine("xgboost")

# Create the workflow
workflow <- workflow() |> add_recipe(recipe) |> add_model(model)

# Fit the model
fit <- workflow |> fit(data = train)