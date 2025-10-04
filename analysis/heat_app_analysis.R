

library(tidyverse)
library(readxl)
library(mgcv)
library(viridis)
library(gratia)
library(cowplot)

#--- read data 
df_raw <- read_excel("K_paper_weather_Database.xlsx", sheet = "Final Database")
df_raw %>% glimpse()

convert_to_minutes <- function(x) {
  # Identify which entries are "DNF"
  is_dnf <- x == "DNF"
  
  # Replace "DNF" with "0:00:00" for parsing purposes
  to_parse <- ifelse(is_dnf, "0:00:00", x)
  parsed <- hms(to_parse)
  
  # Warn for any other parsing failures (ignoring "DNF" and "0:00:00")
  failed <- is.na(parsed) & !is.na(x) & !is_dnf & x != "0:00:00"
  if (any(failed)) {
    warning("Failed to parse the following strings: ", 
            paste(unique(x[failed]), collapse = ", "))
  }
  
  # Convert parsed times to minutes
  minutes <- as.numeric(as.duration(parsed)) / 60
  
  # Return NA for "DNF" and for valid "0:00:00" entries
  result <- ifelse(is_dnf | minutes == 0, NA_real_, minutes)
  result
}



df_raw$race_type %>% unique()
include_events <- c("10k", "3k", "5k", "Marathon")
event_distance_key <- c("10k" = 10000,
                        "3kSC" = 3000,
                        "5k" = 5000,
                        "Marathon" = 42195)

# Read & clean
df <- df_raw %>% 
  select(competition, race_type, sex, host_nation, country, day, month, year, time_of_day,
         lat, long, air_temp_c, dew_point_c, wind_m_s, adjusted_wind_m_s, humidity_pct, heat_index_noaa_2014,
         clouds_okta, solar_rad_cloud_adj_w_m, swbgt_acsm_1984_c, wbgt_yaglou_1956_c,
         world_record, standing_event_record, starts_with("time_")) %>%
  #"berlin" and "Berlin", what a disaster
  mutate(host_nation = str_to_lower(host_nation)) %>%
  mutate(across(c(world_record, standing_event_record, starts_with("time")),
                convert_to_minutes)) %>%
  mutate(race_time_of_day = time_of_day/60) %>%
  select(-time_of_day) %>%
  select(competition, race_type, race_time_of_day, everything()) %>%
  filter(race_type %in% include_events) %>%
  #Rename steeple
  mutate(race_type = ifelse(race_type == "3k", "3kSC", race_type)) %>%
  #Event distances
  mutate(event_distance_m = event_distance_key[race_type]) %>%
  #filter(race_type == "Marathon") %>%
  pivot_longer(
    cols = starts_with("time_"),
    names_to = "place",
    names_prefix = "time_",
    values_to = "time"
  ) %>%
  mutate(place = as.integer(place),
         place_factor = factor(place)) %>%
  drop_na(time) %>%
  #Weather missingness, etc
  mutate(clouds_okta = ifelse(clouds_okta > 9, NA, clouds_okta)) %>%
  #Event stuff
  unite(event_and_year, competition, host_nation, year, remove=FALSE) %>%
  unite(event_name, competition, host_nation, remove=FALSE) %>%
  mutate(event_and_year = factor(event_and_year),
         event_name = factor(event_name),
         sex = factor(sex),
         log_place = log(place)) %>%
  # Outcome meausures
  mutate(pct_slower_than_event_record = 100*(time / standing_event_record - 1),
         pct_slower_than_world_record = 100*(time / world_record - 1),
         time_speed = event_distance_m/(time*60),
         wr_speed = event_distance_m/(world_record*60),
         event_record_speed = event_distance_m/(standing_event_record*60),
         pct_slower_than_event_rec_speed =  100*(event_record_speed / time_speed - 1),
         pct_slower_than_wr_speed =  100*(wr_speed / time_speed - 1),
         log_speed = log(time_speed),
         time_hrs = time/60)   %>%
  mutate(air_temp_f = air_temp_c * 1.8 + 32)



df %>% glimpse()


df %>%
  ggplot(aes(x=air_temp_c, y=dew_point_c)) + 
  geom_point(alpha = 0.2,
              position = position_jitter(width=0.5, height=0.5),
             pch=16)


df %>%
  ggplot(aes(x=air_temp_c, y=humidity_pct)) + 
  geom_point(alpha = 0.2,
             position = position_jitter(width=0.5, height=0.5),
             pch=16)


df %>%
  ggplot(aes(x=heat_index_noaa_2014, y=humidity_pct)) + 
  geom_point(alpha = 0.2,
             position = position_jitter(width=0.5, height=0.5),
             pch=16)


df$event_and_year %>% unique() %>% length()

df %>% summary()


df %>% 
  ggplot(aes(x=place, y=time_speed)) + 
  geom_point(position = position_jitter(width=0.1, height=0), alpha=0.4, pch=16) + 
  facet_wrap(~event_name) + 
  scale_x_log10()





# --- Just marathon
df_mar <- df %>% filter(race_type == "Marathon")


# -- Heat index model -- 
k_place <- 6
k_year <- 12
k_heat <- 6

df_mar %>% glimpse()

mod_mar <- bam(log_speed ~ 1                              # Average marathon speed
               + sex                                      # FYI there is a "both" category for marathons
               + s(log_place, k=k_place, bs="tp")         # lower places are slower (duh)
               + s(event_name, bs="re")                   # Each event is more/less competitive, log-normally
               + s(year, bs="tp", k=k_year)               # Times have a secular trend (training, popularity, shoes)
               + s(heat_index_noaa_2014, k=k_heat),
               data = df_mar, method = "fREML")


summary(mod_mar)

plot(mod_mar, pages=1)

gratia::draw(mod_mar)

#N data
df_mar$event_and_year %>% unique %>% length
df_mar %>% dim






# -- Standardization

#Idea is that the comparison we are making here is same covariates EXCEPT heat index
IDEAL_TEMP_C <- 9 #degrees C, about 48 F (not that important what you pick)

df_standard <- data.frame(year = 2015,
                          log_place = log(1),
                          sex = factor("Both"),
                          event_name = factor("Gold Marathon_berlin"),
                          heat_index_noaa_2014 = IDEAL_TEMP_C) %>%
  mutate(heat_index_f = heat_index_noaa_2014*9/5+32)

df_standard


log_speed_ideal <- predict(mod_mar, newdata = df_standard, type="response")


# --- compare temps --- 

hot_temps_c <- seq(20,40,by=2.5)
hot_temps_f <- seq(65,105, by=5)


temps_c <- data.frame(heat_index_c = hot_temps_c) %>%
  mutate(heat_index_f = hot_temps_c*9/5+32) %>%
  mutate(grid_type = "C")

temps_f <- data.frame(heat_index_f = hot_temps_f,
                      heat_index_c = (hot_temps_f - 32)*5/9)  %>%
  mutate(grid_type = "F")


temp_df <- bind_rows(temps_f, temps_c) %>%
  mutate(heat_index_noaa_2014 = heat_index_c) %>%
  # Add standardized fields
  mutate(year = 2015,
         log_place = log(1),
         sex = factor("Both"),
         event_name = factor("Gold Marathon_berlin"))

# --- Predict in various temps --- 

temp_preds <- predict(mod_mar, newdata = temp_df, type="response")



# -- comparison df -- 

temp_df$log_speed_pred <- temp_preds
temp_df$log_speed_ideal <- log_speed_ideal

calc_df <- temp_df %>%
  mutate(change_in_log_speed = log_speed_pred - log_speed_ideal) %>%
  select(heat_index_c, heat_index_f, grid_type, 
         log_speed_ideal, log_speed_pred, change_in_log_speed) %>%
  unite(temp_id, heat_index_f, grid_type, remove=FALSE)


calc_df


# --- pace nstuff ---

convert_speed_to_pace <- function(speed, units) {
  # Calculate total minutes based on units
  total_minutes <- ifelse(units == "km",
                          (1000 / speed) / 60,          # meters to km, seconds to minutes
                          ifelse(units == "mi",
                                 (1609.344 / speed) / 60, # meters to miles, seconds to minutes
                                 NA))
  
  # Extract minutes and seconds
  minutes <- floor(total_minutes)
  seconds <- round((total_minutes - minutes) * 60)
  
  # Handle edge case where seconds round to 60
  minutes <- ifelse(seconds == 60, minutes + 1, minutes)
  seconds <- ifelse(seconds == 60, 0, seconds)
  
  # Format as "MM:SS" with leading zero for seconds
  sprintf("%.0f:%02.0f", minutes, seconds)
}

# Gridded pace predictions
pace_km <- seq(3, 6, by=0.25)
pace_mi <- seq(5,10, by=0.5)

speed_km <- data.frame(speed_ms = 1/(pace_km*60/1000),
                       pace_decimal = pace_km,
                       units = "km")
speed_mi <- data.frame(speed_ms = 1/(pace_mi*60/1609.344),
                       pace_decimal = pace_mi,
                       units = "mi")

speed_df <- bind_rows(speed_km, speed_mi) %>%
  mutate(log_speed_pace = log(speed_ms)) %>%
  mutate(pace_string = sprintf("%.0f:%02.0f",
                               floor(pace_decimal),
                               60*(pace_decimal-floor(pace_decimal)))) %>%
  #ID for join
  unite(id, pace_string, units, remove=FALSE) %>%
  select(speed_ms, pace_decimal, units, log_speed_pace, pace_string, id)




# units x pace_string unqiuely identifies each row

#For each row, want a temp grid in C and F


expand_df <- expand.grid(id = speed_df$id,
                         temp_id = calc_df$temp_id)

match_df <- expand_df %>% 
  left_join(calc_df, by = "temp_id") %>%
  left_join(speed_df, by="id") %>%
  #HEre's where the magic happens
  mutate(temp_adjusted_log_speed = log_speed_pace + change_in_log_speed) %>%
  mutate(temp_adjusted_speed = exp(temp_adjusted_log_speed)) %>%
  mutate(tadj_pace = convert_speed_to_pace(speed = temp_adjusted_speed,
                                                           units = units))

# seems reasonable


print_deg_f <- match_df %>%
  filter(grid_type == "F", units == "mi") %>%
  select(heat_index_f, pace_string, tadj_pace) %>%
  pivot_wider(names_from = pace_string, 
              values_from = tadj_pace)


print_deg_c <- match_df %>%
  filter(grid_type == "C", units == "km") %>%
  select(heat_index_c, pace_string, tadj_pace) %>%
  pivot_wider(names_from = pace_string, 
              values_from = tadj_pace)


# oddly easier to read in a .txt than .csv to excel when you have time-looking objects
write.csv(print_deg_f, file = "heat_adjusted_F.txt", row.names=FALSE)
write.csv(print_deg_c, file = "heat_adjusted_C.txt", row.names=FALSE)


# --- heat/humidity tensor product model (bivariate smooth nonlinear interaction)
df_mar %>% glimpse()

k_temp <- 4
k_humid <- 5

humidity_knots <- c(0, 20, 40, 60, 80)  # Humidity knots in percent

te_mod_mar <- bam(log_speed ~ 1                              # Average marathon speed
               + sex                                      # FYI there is a "both" category for marathons
               + s(log_place, k=k_place, bs="tp")         # lower places are slower (duh)
               + s(event_name, bs="re")                   # Each event is more/less competitive, log-normally
               + s(year, bs="tp", k=k_year)               # Times have a secular trend (training, popularity, shoes)
               + te(air_temp_c, humidity_pct, 
                    bs = c("cr", "cr"), 
                    k=c(k_temp, k_humid)),
               knots = list(air_temp_c = temp_knots,
                            humidity_pct = humidity_knots),
               data = df_mar, method = "fREML")

summary(te_mod_mar)

te_mod_mar$residuals %>% sd()

saveRDS(te_mod_mar, file = "marathon_heat_humidity_te_model.rds")


gratia::draw(te_mod_mar, dist=0.3, n_contour = 16)


ng <- 101
df_standard <- data.frame(year = 2015,
                          log_place = log(1),
                          sex = factor("Both"),
                          event_name = factor("Gold Marathon_berlin"), 
                          air_temp_c = 8,
                          humidity_pct = 0)

lp_adjust <- predict(te_mod_mar, newdata = df_standard, type = "response")
df_grid <- expand.grid(year = 2015,
                       log_place = log(1),
                       sex = factor("Both"),
                       event_name = factor("Gold Marathon_berlin"),
                       air_temp_c = seq(0,40, length.out = ng),
                       humidity_pct = seq(0, 100, by=10))


grid_raw <- predict(te_mod_mar, newdata = df_grid, type = "response")


df_grid$yhat_adjust <- as.numeric(grid_raw) - lp_adjust[1]


df_grid %>% glimpse()



lwd <- 1.5


p1 <- df_grid %>%
  ggplot(aes(x=air_temp_c, y=yhat_adjust, color = factor(humidity_pct))) + 
  geom_line(linewidth = lwd) + 
  geom_rug(aes(y=0, x=air_temp_c), inherit.aes=FALSE, data = df_mar, sides = "b") + 
  scale_color_viridis_d(option = "inferno") + 
  scale_y_reverse()

p1 


p2 <- df_mar %>%
  ggplot(aes(x=humidity_pct)) + 
  geom_density(fill = "navy", alpha=0.3) + 
  geom_rug(sides = "b") + 
  scale_x_continuous(limits = c(0,100))




plot_grid(p1, p2, ncol=1, rel_heights = c(3,1))




df_mar %>% glimpse()


#Grid monotonization

# For each point HOTTER and HUMIDIER than ideal....
# If the te(t,h) value is more positive than te() value at ideal, "flatten" it (max? min?)

temp_grid <- seq(0, 45, by = 1)
humid_grid <- seq(0, 100, by= 1)



approx_grid <- expand.grid(year = 2015,
                       log_place = log(1),
                       sex = factor("Both"),
                       event_name = factor("Gold Marathon_berlin"),
                       air_temp_c = temp_grid,
                       humidity_pct = humid_grid)


# ok....now...
# predict response grid yhat adjust here..., also need the exact df_ideal here to get precise lp value


ideal_baseline <- predict(te_mod_mar, newdata = df_standard, type="response")[1]
ideal_baseline


approx_grid$yhat <- predict(te_mod_mar, newdata = approx_grid, type="response") %>%
  as.vector()



approx_grid %>% glimpse()


approx_grid %>%
  ggplot(aes(x=air_temp_c, y=humidity_pct, color = yhat)) + 
  geom_point(pch=16, size=4) + 
  scale_color_viridis(option="turbo")



#baseline check
approx_grid %>%
  mutate(above_baseline = yhat > ideal_baseline) %>%
  ggplot(aes(x=air_temp_c, y=humidity_pct, color = above_baseline)) + 
  geom_point(pch=16, size=4) 



approx_grid %>%
  filter(air_temp_c >=15) %>%
  ggplot(aes(x=air_temp_c, y=humidity_pct, color = yhat)) + 
  geom_point(pch=16, size=4) + 
  scale_color_viridis(option="turbo")



# -- Monotoonizing and fixing baseline

modify_df <- approx_grid %>%
  # This deals with conditions that are "faster than ideal"
  # if yhat is greater that means predicted speed is faster, since log is monotonic
  mutate(yhat_adjust = ifelse(yhat > ideal_baseline, ideal_baseline, yhat)) %>%
  mutate(yhat_mono = yhat_adjust)



modify_df %>%
  ggplot(aes(x=air_temp_c, y=yhat_adjust, color=factor(humidity_pct))) + 
  geom_line(linewidth = 2) +
  scale_color_viridis_d(option = "magma")


# Mononitze loopwise

#For each temp, humidity should ALWAYS make it worse (more negative yhat) vs. lower humid
for (i in 1:length(temp_grid)) {
  this_temp <- temp_grid[i]
  print(this_temp)
  
  #Sweep baseline should be the zero percetne humidity value for this temp grid
  
  biggest_yhat <- modify_df %>%
    filter(air_temp_c == this_temp, humidity_pct == 0) %>%
    pull(yhat_mono)
  
  for (j in 1:length(humid_grid)){
    this_humid <- humid_grid[j]
    
    #Get the (unique) yhat value for this temp/humidity and its index
    this_yhat_ix <- which(modify_df$humidity_pct == this_humid & 
                           modify_df$air_temp_c == this_temp)
    this_yhat <- modify_df$yhat_mono[this_yhat_ix]
    
    stopifnot(length(this_yhat) == 1) #Assert sanity check that we only got one match
    
    if (this_yhat > biggest_yhat){
      modify_df$yhat_mono[this_yhat_ix] <- biggest_yhat
    } else {
      biggest_yhat <- this_yhat
    }
    #Needs to happen inside the else statement, otherwise it drags it up I think
    
  }
}

#Check result
modify_df %>%
  ggplot(aes(x=air_temp_c, y=yhat_mono, color=factor(humidity_pct))) + 
  geom_line(linewidth = 2) +
  scale_color_viridis_d(option = "magma")

# Good stuff


# --- Now the FINAL adjustment should be ideal baseline minus yhat mono (giving negative numbers)
# -- which are the thing you add to log(speed) -- log base e of course


modify_df$yhat_final <- modify_df$yhat_mono - ideal_baseline


modify_df %>%
  ggplot(aes(x=air_temp_c, y=yhat_final, color=factor(humidity_pct))) + 
  geom_line(linewidth = 2) +
  scale_color_viridis_d(option = "magma")


export_df <- modify_df %>%
  mutate(logspeed_adjust = yhat_final) %>%
  select(air_temp_c, humidity_pct, logspeed_adjust)


glimpse(export_df)

#Drop fitted model from list to jsonify
json_list <- as.list(export_df)


library(jsonlite)

# -- exoprt as json for easy javascriptification
tmod_json <- toJSON(json_list, pretty=TRUE, auto_unbox=TRUE)
write(tmod_json, "heat_humidity_adjustments_fine_v2025-09-04.json")
# This is a lookup grid, can use bilinear interpolation


# ---- Heat index export ---- 
heat_index_grid <- data.frame(heat_index_noaa_2014 = temp_grid) %>%
  mutate(year = 2015,
         log_place = log(1),
         sex = factor("Both"),
         event_name = factor("Gold Marathon_berlin"))

hi_yhat <- predict(mod_mar, newdata = heat_index_grid, type="response")


hi_yhat_adjust <- hi_yhat - max(hi_yhat)


heat_index_export <- heat_index_grid %>%
  mutate(logspeed_adjust = hi_yhat_adjust) %>%
  select(heat_index_noaa_2014, logspeed_adjust)


heat_index_json_list <- as.list(heat_index_export)

himod_json <- toJSON(heat_index_json_list, pretty=TRUE, auto_unbox=TRUE)
write(himod_json, "heat_index_adjustments_v2025-09-04.json")

# Warnings to flag: 

# Temp below 0 C -- outside data
# Temp above 32 C -- outside data range
# Humidity below 25% - VERY rare, outside data range (also kick warning if equivalent dewpoint)
# Deal with impossible dewpoints in js (disallow)