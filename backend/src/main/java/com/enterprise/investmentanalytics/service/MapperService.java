package com.enterprise.investmentanalytics.service;

import com.enterprise.investmentanalytics.dto.response.TransactionResponse;
import com.enterprise.investmentanalytics.model.entity.Transaction;
import com.enterprise.investmentanalytics.model.entity.User;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@lombok.RequiredArgsConstructor
public class MapperService {

    private final S3Service s3Service;

    public TransactionResponse toTransactionResponse(Transaction transaction) {
        String screenshotUrl = transaction.getScreenshotPath();
        // If it's not a local path (heuristic), try to sign it
        if (screenshotUrl != null && !screenshotUrl.startsWith("uploads")) {
            try {
                String signed = s3Service.generatePresignedUrl(screenshotUrl);
                if (signed != null)
                    screenshotUrl = signed;
            } catch (Exception e) {
                // Ignore S3 errors, return original string (might be local fallback or
                // misconfig)
            }
        }

        return TransactionResponse.builder()
                .id(transaction.getId())
                .type(transaction.getType())
                .amount(transaction.getAmount())
                .description(transaction.getDescription())
                .messageContent(transaction.getMessageContent())
                .screenshotPath(screenshotUrl)
                .date(transaction.getCreatedAt())
                .build();
    }
}
