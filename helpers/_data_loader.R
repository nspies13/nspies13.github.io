# Data Loader

## Download and Import BMP Data Directly from FigShare 
#data <- read_csv("https://figshare.com/ndownloader/files/45355549")
#model_realtime <- read_rds("https://figshare.com/ndownloader/files/45451684") |> pluck("model") |> bundle::unbundle()
#model_retrospective <- read_rds("https://figshare.com/ndownloader/files/45451717") |> pluck("model") |> bundle::unbundle()

## Download Locally, Then Import. ** Change These Paths To Your Own Local Downloads **
#data <- arrow::read_feather("../data/anonymized_bmp_data_all.feather")

## Split Data into Training and Validation Sets
#train <- data |> dplyr::filter(dataset == "WashU Train")
#validation <- data |> dplyr::filter(dataset == "WashU Validation")

## Load the Relevant Models
#model_realtime <- read_rds("../data/normal_saline_XGB_BMP_current_with_deltas.rds") |> pluck("model") |> bundle::unbundle()
#model_retrospective <- read_rds("../data/normal_saline_XGB_BMP_prior_current_and_post.rds") |> pluck("model") |> bundle::unbundle()