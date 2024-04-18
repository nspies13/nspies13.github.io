# Load required libraries
library(shiny)
library(tidymodels)
library(tidyverse)
library(geomtextpath)

theme_ns <- theme(text = element_text(family = "Helvetica"),
                  title = element_text(size = 24, margin = margin(0, 0, 8, 0)),
                  plot.subtitle = element_text(size = 20, face = "plain", hjust = 0),
                  plot.title = element_text(hjust = 0),
                  axis.title = element_text(size = 16, face = "bold", margin = margin(4,4,4,4)),
                  axis.title.x.bottom = element_text(face = "bold", margin = margin(4,0,0,0)),
                  axis.title.y.left = element_text(face = "bold", margin = margin(0,4,0,0)),
                  legend.title = element_text(face = "bold.italic", size = 12),
                  axis.line = element_line(),
                  axis.ticks = element_blank(),
                  panel.grid = element_blank(), 
                  panel.background = element_blank(),
                  strip.text = element_text(size = 12, face = "bold.italic"),
                  strip.background = element_blank())
theme_set(theme_ns)

# Define UI
ui <- fluidPage(
  titlePanel("Interactive ROC and PR Curves"),
  fluidRow(
      column(4,
             sliderInput("prevalence",
                         "Prevalence of Positive Class:",
                         min = 0,
                         max = 1,
                         value = 0.5,
                         step = 0.01))),
    mainPanel(width = 12,
      plotOutput("densityPlot")
    )
  )


# Define server logic
server <- function(input, output) {
  
  prevalence <- reactive({ input$prevalence })
  separation <- reactive({ input$separation })
  
  output$densityPlot <- renderPlot({
    
    n_pos <- 10000 * prevalence() 
    n_neg <- 10000
    pos <- tibble(result = rnorm(n_pos, mean = 0.65, sd = 0.15), label = "Positive")
    neg <- tibble(result = rnorm(n_neg, mean = 0.35, sd = 0.15), label = "Negative")
    data <- bind_rows(pos, neg) |> mutate(label = factor(label, levels = c("Positive", "Negative")))
    
    # Plot distributions
    gg_dens <- 
      ggplot(data, aes(result, y = stat(count), fill = label)) +
        geom_density(alpha = 0.5, linewidth = 0) +
        geom_textdensity(data = pos, aes(label = label), face = "bold", hjust = 0.75) +
        geom_textdensity(data = neg, aes(label = label), face = "bold", hjust = 0.25) +
        labs(x = "Predicted Probability", y = "Frequency") +
        scale_x_continuous(name = "Predicted Probability", breaks = c(0, 0.5, 1), limits = c(0, 1)) +
        scale_y_continuous(name = "Frequency", breaks = NULL) +
        ggtitle("Distribution of Results Between Classes") +
        theme(legend.position = "none")
    
    # Calculate ROC curve
    roc <- data |> roc_curve(result, truth = label)
    
    # Plot ROC curve
    gg_roc <- 
      ggplot(roc, aes(1-specificity, sensitivity)) +
        geom_path(color = "darkred", linewidth = 2) +
        geom_abline(intercept = 0, slope = 1, linetype = "dashed", color = "grey50") +
        labs(x = "False Positive Rate", y = "True Positive Rate", title = "ROC Curve")
    
    # Calculate PR curve
    pr <- data |> pr_curve(result, truth = label)
    
    # Plot PR curve
    gg_pr <- 
      ggplot(pr, aes(recall, precision)) +
        geom_path(color = "darkred", linewidth = 2) +
        labs(x = "Sensitivity (Recall)", y = "PPV (Precision)", title = "PR Curve")
    
    ggpubr::ggarrange(gg_dens, gg_roc, gg_pr, ncol = 3, nrow = 1)
    
  })
  
}

# Run the application
shinyApp(ui = ui, server = server)
