package com.enterprise.investmentanalytics;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class InvestmentAnalyticsApplication {

	public static void main(String[] args) {
		SpringApplication.run(InvestmentAnalyticsApplication.class, args);
	}

}
