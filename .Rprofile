source("renv/activate.R")

## Load Libraries
library(tidyverse)
library(tidymodels)

## Configure Environment
set.seed(12345)

## Set ggplot2 theme
theme_ns <- theme(text = element_text(family = "Helvetica"),
                  title = element_text(size = 20, face = "bold.italic", margin = margin(0, 0, 8, 0)),
                  plot.subtitle = element_text(size = 18, face = "plain", hjust = 0),
                  plot.title = element_text(hjust = 0),
                  axis.title = element_text(size = 18, face = "bold", margin = margin(4,4,4,4)),
                  axis.text = element_text(size = 14, face = "bold", color = "black"),
                  axis.title.x.bottom = element_text(face = "bold", margin = margin(4,0,0,0)),
                  axis.title.y.left = element_text(face = "bold", margin = margin(0,4,0,0)),
                  legend.title = element_text(face = "bold", size = 14),
                  legend.text = element_text(size = 12),
                  legend.background = element_blank(),
                  axis.line = element_line(),
                  axis.ticks = element_blank(),
                  panel.grid = element_blank(), 
                  panel.background = element_blank(),
                  plot.background = element_blank(),
                  strip.text = element_text(size = 14, face = "bold.italic"),
                  strip.background = element_blank())
theme_set(theme_ns)
