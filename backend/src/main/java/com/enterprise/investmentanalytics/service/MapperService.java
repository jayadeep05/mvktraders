package com.enterprise.investmentanalytics.service;

import com.enterprise.investmentanalytics.dto.response.TransactionResponse;
import com.enterprise.investmentanalytics.model.entity.Transaction;
import com.enterprise.investmentanalytics.model.entity.User;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class MapperService {

    public TransactionResponse toTransactionResponse(Transaction transaction) {
        return TransactionResponse.builder()
                .id(transaction.getId())
                .type(transaction.getType())
                .amount(transaction.getAmount())
                .description(transaction.getDescription())
                .messageContent(transaction.getMessageContent())
                .screenshotPath(transaction.getScreenshotPath())
                .date(transaction.getCreatedAt())
                .build();
    }
}
